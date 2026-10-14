import { createHmac, randomInt } from "node:crypto";
import { CappedMap, createChallenge, type Challenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { verify } from "altcha-lib/frameworks/shared";
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
const usedNonces = new CappedMap<string, boolean>({ maxSize: 10_000 });

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

/**
 * Checks the base64 payload the ALTCHA widget submits: a solution to an unexpired challenge we
 * signed, that hasn't been used before.
 */
export async function verifyAltcha(value: unknown): Promise<boolean> {
  if (typeof value !== "string") {
    return false;
  }
  const { hmacSignatureSecret, hmacKeySignatureSecret } = secrets();
  const { error } = await verify(
    value,
    deriveKey,
    hmacSignatureSecret,
    hmacKeySignatureSecret,
    usedNonces,
  );
  return error === null;
}
