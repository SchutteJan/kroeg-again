import { createHmac, randomInt } from "node:crypto";
import { CappedMap, createChallenge, verifySolution, type Challenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { z } from "zod";
import { getConfig } from "./config";

/** Form field the widget puts its payload in. */
export const ALTCHA_FIELD = "altcha";

const CHALLENGE_TTL_SECONDS = 10 * 60;

export interface ChallengeDifficulty {
  /** PBKDF2 iterations per attempt. */
  cost: number;
  /** Range the counter (number of attempts the client needs) is drawn from. */
  minCounter: number;
  maxCounter: number;
}

const DEFAULT_DIFFICULTY: ChallengeDifficulty = {
  cost: 5_000,
  minCounter: 5_000,
  maxCounter: 10_000,
};

/**
 * Nonces of challenges that have already been accepted, so a solved payload can't be replayed.
 * In-memory, so it only covers a single process. Entries outlive the challenge TTL as long as
 * fewer than `maxSize` challenges are solved within it.
 */
const usedNonces = new CappedMap<string, true>({ maxSize: 10_000 });

function secrets() {
  const hmacSignatureSecret = getConfig().altchaHmacSecret || "development-signature";
  return {
    hmacSignatureSecret,
    // Signs the derived key, so verification is a single HMAC instead of re-running the PoW.
    hmacKeySignatureSecret: createHmac("sha256", hmacSignatureSecret)
      .update("altcha-key-signature")
      .digest("hex"),
  };
}

export function createAltchaChallenge(
  difficulty: ChallengeDifficulty = DEFAULT_DIFFICULTY,
): Promise<Challenge> {
  return createChallenge({
    algorithm: "PBKDF2/SHA-256",
    cost: difficulty.cost,
    counter: randomInt(difficulty.minCounter, difficulty.maxCounter + 1),
    expiresAt: Math.floor(Date.now() / 1_000) + CHALLENGE_TTL_SECONDS,
    deriveKey,
    ...secrets(),
  });
}

const PayloadSchema = z.object({
  challenge: z.object({
    parameters: z.object({
      algorithm: z.string(),
      nonce: z.string(),
      salt: z.string(),
      cost: z.number(),
      keyLength: z.number(),
      keyPrefix: z.string(),
      keySignature: z.string().optional(),
      expiresAt: z.number().optional(),
    }),
    signature: z.string().optional(),
  }),
  solution: z.object({
    counter: z.number(),
    derivedKey: z.string(),
  }),
});

/**
 * Checks the base64 payload the ALTCHA widget submits: a solution to an unexpired challenge we
 * signed, that hasn't been used before.
 */
export async function verifyAltcha(value: unknown): Promise<boolean> {
  if (typeof value !== "string") {
    return false;
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(atob(value));
  } catch {
    return false;
  }

  const parsed = PayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    console.error(parsed.error);
    return false;
  }
  const payload = parsed.data;

  const { verified } = await verifySolution({
    challenge: payload.challenge,
    solution: payload.solution,
    deriveKey,
    ...secrets(),
  });

  if (!verified) {
    return false;
  }

  // No await between the check and the set, so concurrent submissions can't both pass.
  const nonce = payload.challenge.parameters.nonce;
  if (usedNonces.has(nonce)) {
    return false;
  }
  usedNonces.set(nonce, true);
  return true;
}
