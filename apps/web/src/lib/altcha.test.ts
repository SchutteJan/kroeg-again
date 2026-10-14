import { solveChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { beforeAll, describe, expect, it } from "vitest";
import { createAltchaChallenge, verifyAltcha } from "./altcha";

const EASY = { cost: 1, minCounter: 1, maxCounter: 20 };

async function solvedPayload() {
  const challenge = await createAltchaChallenge(EASY);
  const solution = await solveChallenge({ challenge, deriveKey });
  if (!solution) {
    throw new Error("Could not solve challenge");
  }
  return btoa(JSON.stringify({ challenge, solution }));
}

describe("verifyAltcha", () => {
  beforeAll(() => {
    process.env.DATABASE_URL ??= "postgres://test";
    process.env.PUBLIC_BASE_URL ??= "http://localhost:3000";
  });

  it("accepts a solved challenge", async () => {
    expect(await verifyAltcha(await solvedPayload())).toBe(true);
  });

  it("rejects a payload that was already used", async () => {
    const payload = await solvedPayload();
    expect(await verifyAltcha(payload)).toBe(true);
    expect(await verifyAltcha(payload)).toBe(false);
  });

  it("rejects a wrong solution", async () => {
    const challenge = await createAltchaChallenge(EASY);
    const payload = btoa(
      JSON.stringify({ challenge, solution: { counter: 0, derivedKey: "00".repeat(32) } }),
    );
    expect(await verifyAltcha(payload)).toBe(false);
  });

  it("rejects missing and malformed payloads", async () => {
    expect(await verifyAltcha(null)).toBe(false);
    expect(await verifyAltcha("")).toBe(false);
    expect(await verifyAltcha("not base64 json")).toBe(false);
  });
});
