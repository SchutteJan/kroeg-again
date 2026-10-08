import { afterAll, afterEach, assert, describe, expect, it, vi } from "vitest";
import { otpFragmentDefinition } from "..";
import { ottRoutesFactory } from "../ott/ott";
import {
  generateBackupCode,
  generateTOTP,
  hashBackupCode,
  totpRoutesFactory,
  verifyBackupCode,
} from "./totp";
import { buildDatabaseFragmentsTest } from "@fragno-dev/test";
import { instantiate } from "@fragno-dev/core";

describe("TOTP (Time-based One-Time Password)", async () => {
  const { fragments, test } = await buildDatabaseFragmentsTest()
    .withTestAdapter({ type: "drizzle-pglite" })
    .withFragment(
      "otp",
      instantiate(otpFragmentDefinition).withRoutes([ottRoutesFactory, totpRoutesFactory]),
    )
    .build();

  const fragment = fragments.otp;

  afterAll(async () => {
    await test.cleanup();
  });

  describe("Full TOTP flow", async () => {
    let userId: string;
    let backupCodes: string[];

    // Use a test user ID for this flow
    userId = "totp-test-user";

    it("/totp/status - check TOTP not enabled initially", async () => {
      const response = await fragment.callRoute("GET", "/totp/status", {
        query: { userId },
      });
      assert(response.type === "json");
      expect(response.data.enabled).toBe(false);
    });

    it("/totp/enable - enable TOTP for user", async () => {
      const response = await fragment.callRoute("POST", "/totp/enable", {
        body: { userId },
      });
      assert(response.type === "json");
      expect(response.data).toMatchObject({
        secret: expect.any(String),
        qrCodeUrl: expect.stringContaining("otpauth://totp/"),
        backupCodes: expect.any(Array),
      });
      expect(response.data.backupCodes).toHaveLength(10);

      // Check in the db it actually got created
      const secret = await fragment.deps.db.findFirst("totp_secret", (b) =>
        b.whereIndex("primary", () => true),
      );

      expect(secret?.secret).toBe(response.data.secret);

      backupCodes = response.data.backupCodes;
    }, 20000);

    it("/totp/status - check TOTP enabled after setup", async () => {
      const response = await fragment.callRoute("GET", "/totp/status", {
        query: { userId },
      });
      assert(response.type === "json");
      expect(response.data.enabled).toBe(true);
    });

    it("/totp/enable - fail when already enabled", async () => {
      const response = await fragment.callRoute("POST", "/totp/enable", {
        body: { userId },
      });
      assert(response.type === "error");
      expect(response.error.code).toBe("totp_already_enabled");
    }, 20000);

    it("/totp/verify - reject invalid TOTP code", async () => {
      const response = await fragment.callRoute("POST", "/totp/verify", {
        body: { userId, code: "000000" },
      });
      assert(response.type === "error");
      expect(response.error.code).toBe("totp_invalid_code");
    });

    it("/totp/verify-backup - verify backup code", async () => {
      const backupCode = backupCodes[0];
      const response = await fragment.callRoute("POST", "/totp/verify-backup", {
        body: { userId, code: backupCode },
      });
      assert(response.type === "json");
      expect(response.data.valid).toBe(true);
    });

    it("/totp/verify-backup - fail to reuse same backup code", async () => {
      const backupCode = backupCodes[0];
      const response = await fragment.callRoute("POST", "/totp/verify-backup", {
        body: { userId, code: backupCode },
      });
      assert(response.type === "error");
      expect(response.error.code).toBe("backup_code_invalid");
    });

    it("/totp/verify-backup - verify another backup code", async () => {
      const backupCode = backupCodes[1];
      const response = await fragment.callRoute("POST", "/totp/verify-backup", {
        body: { userId, code: backupCode },
      });
      assert(response.type === "json");
      expect(response.data.valid).toBe(true);
    });

    it("/totp/verify-backup - accept lowercase backup code", async () => {
      const response = await fragment.callRoute("POST", "/totp/verify-backup", {
        body: { userId, code: backupCodes[2].toLowerCase() },
      });
      assert(response.type === "json");
      expect(response.data.valid).toBe(true);
    });

    it("/totp/verify-backup - reject unknown backup code", async () => {
      const unknownCode = backupCodes.includes("ZZZZZZZZ") ? "YYYYYYYY" : "ZZZZZZZZ";
      const response = await fragment.callRoute("POST", "/totp/verify-backup", {
        body: { userId, code: unknownCode },
      });
      assert(response.type === "error");
      expect(response.error.code).toBe("backup_code_invalid");
    });

    it("/totp/verify-backup - reject for user without TOTP", async () => {
      const response = await fragment.callRoute("POST", "/totp/verify-backup", {
        body: { userId: "user-without-totp", code: backupCodes[3] },
      });
      assert(response.type === "error");
      expect(response.error.code).toBe("backup_code_invalid");
    });

    it("consumeBackupCode - reject a stale snapshot", async () => {
      const services = fragment.services;

      // Snapshot the backup codes while verifying backupCodes[3]
      const verifyResult = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.verifyBackupCode(userId, backupCodes[3])])
          .execute()
          .then(([result]) => result);
      });
      assert(
        verifyResult.valid && verifyResult.expectedBackupCodes && verifyResult.nextBackupCodes,
      );

      // Another request consumes a different code, which changes the stored codes
      const response = await fragment.callRoute("POST", "/totp/verify-backup", {
        body: { userId, code: backupCodes[4] },
      });
      assert(response.type === "json");

      const consumeResult = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.consumeBackupCode(
              userId,
              verifyResult.expectedBackupCodes!,
              verifyResult.nextBackupCodes!,
            ),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(consumeResult.success).toBe(false);

      // The stale consume must not have removed backupCodes[3] or restored backupCodes[4]
      const stillValid = await fragment.callRoute("POST", "/totp/verify-backup", {
        body: { userId, code: backupCodes[3] },
      });
      assert(stillValid.type === "json");
      const reused = await fragment.callRoute("POST", "/totp/verify-backup", {
        body: { userId, code: backupCodes[4] },
      });
      assert(reused.type === "error");
      expect(reused.error.code).toBe("backup_code_invalid");
    }, 20000);

    it("/totp/disable - disable TOTP for user", async () => {
      const response = await fragment.callRoute("POST", "/totp/disable", {
        body: { userId },
      });
      assert(response.type === "json");
      expect(response.data.success).toBe(true);
    });

    it("/totp/status - check TOTP disabled after removal", async () => {
      const response = await fragment.callRoute("GET", "/totp/status", {
        query: { userId },
      });
      assert(response.type === "json");
      expect(response.data.enabled).toBe(false);
    });

    it("/totp/disable - fail when not enabled", async () => {
      const response = await fragment.callRoute("POST", "/totp/disable", {
        body: { userId },
      });
      assert(response.type === "error");
      expect(response.error.code).toBe("totp_not_enabled");
    });
  });
});

describe("generateTOTP", () => {
  // RFC 6238 Appendix B test secret: ASCII "12345678901234567890", base32-encoded
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  const atTime = (unixSeconds: number) => {
    vi.spyOn(Date, "now").mockReturnValue(unixSeconds * 1000);
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ])("matches RFC 6238 SHA-1 vector at T=%i", async (unixSeconds, expected) => {
    atTime(unixSeconds);
    expect(await generateTOTP(secret, 30, 8)).toBe(expected);
  });

  it("defaults to 6 digits with a 30 second step", async () => {
    atTime(59);
    expect(await generateTOTP(secret)).toBe("287082");
  });

  it("zero-pads codes with leading zeros", async () => {
    atTime(1111111109);
    expect(await generateTOTP(secret, 30, 8)).toBe("07081804");
  });

  it("returns the same code within a time step and a new one in the next step", async () => {
    atTime(30);
    const start = await generateTOTP(secret);
    atTime(59);
    const end = await generateTOTP(secret);
    atTime(60);
    const next = await generateTOTP(secret);

    expect(end).toBe(start);
    expect(next).not.toBe(start);
  });

  it("respects a custom time step", async () => {
    // T=59 with a 60s step is counter 0, which is RFC 4226 HOTP vector 0
    atTime(59);
    expect(await generateTOTP(secret, 60)).toBe("755224");
  });
});

describe("backup code utilities", () => {
  describe("generateBackupCode", () => {
    it("generates an 8-character uppercase alphanumeric code", () => {
      for (let i = 0; i < 100; i++) {
        expect(generateBackupCode()).toMatch(/^[A-Z0-9]{8}$/);
      }
    });

    it("generates distinct codes", () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateBackupCode()));
      expect(codes.size).toBe(100);
    });
  });

  describe("hashBackupCode", () => {
    it("produces a salt:iterations:hash string", async () => {
      const hash = await hashBackupCode("ABCD1234");
      expect(hash).toMatch(/^[0-9a-f]{32}:100000:[0-9a-f]{64}$/);
    });

    it("uses a random salt per hash", async () => {
      const [a, b] = await Promise.all([hashBackupCode("ABCD1234"), hashBackupCode("ABCD1234")]);
      expect(a).not.toBe(b);
    });

    it("does not contain the plain code", async () => {
      const hash = await hashBackupCode("ABCD1234");
      expect(hash).not.toContain("ABCD1234");
    });
  });

  describe("verifyBackupCode", () => {
    it("accepts the code that was hashed", async () => {
      const hash = await hashBackupCode("ABCD1234");
      expect(await verifyBackupCode("ABCD1234", hash)).toBe(true);
    });

    it("rejects a different code", async () => {
      const hash = await hashBackupCode("ABCD1234");
      expect(await verifyBackupCode("ABCD1235", hash)).toBe(false);
    });

    it("is case-sensitive", async () => {
      const hash = await hashBackupCode("ABCD1234");
      expect(await verifyBackupCode("abcd1234", hash)).toBe(false);
    });

    it("rejects when the stored hash was tampered with", async () => {
      const hash = await hashBackupCode("ABCD1234");
      const lastChar = hash.at(-1) === "0" ? "1" : "0";
      expect(await verifyBackupCode("ABCD1234", hash.slice(0, -1) + lastChar)).toBe(false);
    });

    it("rejects when the stored hash has a different length", async () => {
      const hash = await hashBackupCode("ABCD1234");
      expect(await verifyBackupCode("ABCD1234", hash.slice(0, -2))).toBe(false);
    });

    it("uses the salt from the stored hash", async () => {
      const hash = await hashBackupCode("ABCD1234");
      const [, iterations, digest] = hash.split(":");
      const otherSalt = "00".repeat(16);
      expect(await verifyBackupCode("ABCD1234", `${otherSalt}:${iterations}:${digest}`)).toBe(
        false,
      );
    });

    it("uses the iteration count from the stored hash", async () => {
      const hash = await hashBackupCode("ABCD1234");
      const [salt, , digest] = hash.split(":");
      expect(await verifyBackupCode("ABCD1234", `${salt}:1000:${digest}`)).toBe(false);
    });
  });
});
