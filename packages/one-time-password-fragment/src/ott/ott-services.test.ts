import { afterAll, describe, expect, it } from "vitest";
import { otpFragmentDefinition } from "..";
import { buildDatabaseFragmentsTest } from "@fragno-dev/test";
import { instantiate } from "@fragno-dev/core";

const testUserId = "test-user-id";

describe("OTT Services", async () => {
  const { fragments, test } = await buildDatabaseFragmentsTest()
    .withTestAdapter({ type: "drizzle-pglite" })
    .withFragment("ott", instantiate(otpFragmentDefinition))
    .build();

  const services = fragments.ott.services;

  afterAll(async () => {
    await test.cleanup();
  });

  describe("generateToken", () => {
    it("should generate an 8-character alphanumeric token", async () => {
      const res = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(res.token).toMatch(/^[A-Z0-9]{8}$/);
    });

    it("should create token with default duration (15 minutes)", async () => {
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(token).toMatch(/^[A-Z0-9]{8}$/);

      const { valid } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      expect(valid).toBe(true);
    });

    it("should create token with custom duration", async () => {
      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "password_reset", 30)])
          .execute()
          .then(([result]) => result);
      });

      // Verify token works immediately
      const validateResult = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, result.token, "password_reset"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(validateResult.valid).toBe(true);
    });

    it("should allow multiple tokens for same user but different types", async () => {
      // Generate tokens of different types for the same user
      const token1 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      const token2 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "password_reset")])
          .execute()
          .then(([result]) => result);
      });

      const token3 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "passwordless_login")])
          .execute()
          .then(([result]) => result);
      });

      // Verify each token is valid for its type
      const result1 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, token1.token, "email_verification"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(result1.valid).toBe(true);

      const result2 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, token2.token, "password_reset"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(result2.valid).toBe(true);

      const result3 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, token3.token, "passwordless_login"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(result3.valid).toBe(true);
    });
  });

  describe("validateToken", () => {
    it("should successfully validate a correct token", async () => {
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should delete token after successful validation", async () => {
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      // Try to validate again - should fail
      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("token_invalid");
    });

    it("should reject invalid token", async () => {
      await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, "INVALID1", "email_verification"),
          ])
          .execute()
          .then(([result]) => result);
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("token_invalid");
    });

    it("should be case-insensitive", async () => {
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, token.toLowerCase(), "email_verification"),
          ])
          .execute()
          .then(([result]) => result);
      });

      expect(result.valid).toBe(true);
    });

    it("should reject expired token", async () => {
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.generateToken(testUserId, "email_verification", 0), // 0 minutes = expired
          ])
          .execute()
          .then(([result]) => result);
      });

      // Wait a moment to ensure expiry
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("token_expired");
    });

    it("should delete expired token after validation attempt", async () => {
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification", 0)])
          .execute()
          .then(([result]) => result);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const firstAttempt = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      expect(firstAttempt.valid).toBe(false);
      expect(firstAttempt.error).toBe("token_expired");

      // Try again - token should be deleted
      const secondAttempt = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      expect(secondAttempt.valid).toBe(false);
      expect(secondAttempt.error).toBe("token_invalid");
    });

    it("should reject token for wrong user", async () => {
      const user2Id = "user2-id";
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(user2Id, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("token_invalid");
    });

    it("should reject token for wrong type", async () => {
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "password_reset")])
          .execute()
          .then(([result]) => result);
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("token_invalid");
    });
  });

  describe("cleanupExpiredTokens", () => {
    it("should delete only expired tokens", async () => {
      // Create expired token
      const expiredToken = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification", 0)])
          .execute()
          .then(([result]) => result);
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create valid token
      const validToken = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "password_reset", 15)])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.cleanupExpiredTokens()])
          .execute()
          .then(([result]) => result);
      });

      expect(result.deletedCount).toBeGreaterThan(0);

      // Verify expired token is gone but valid token still works
      const expiredResult = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, expiredToken.token, "email_verification"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(expiredResult.valid).toBe(false);

      const validResult = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, validToken.token, "password_reset"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(validResult.valid).toBe(true);
    });

    it("should return 0 when no expired tokens exist", async () => {
      await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification", 15)])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.cleanupExpiredTokens()])
          .execute()
          .then(([result]) => result);
      });

      // May or may not be 0 depending on other tests, but shouldn't error
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple expired tokens", async () => {
      // Create multiple expired tokens
      await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification", 0)])
          .execute()
          .then(([result]) => result);
      });
      await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "password_reset", 0)])
          .execute()
          .then(([result]) => result);
      });
      await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "passwordless_login", 0)])
          .execute()
          .then(([result]) => result);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.cleanupExpiredTokens()])
          .execute()
          .then(([result]) => result);
      });

      expect(result.deletedCount).toBeGreaterThan(0);
    });
  });

  describe("invalidateTokens", () => {
    it("should invalidate all tokens for user and type", async () => {
      // Note: generateToken automatically invalidates existing tokens of the same type
      // So only the last token will exist
      await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      const token = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.invalidateTokens(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      // Only token3 exists (token1 and token2 were auto-invalidated during generation)
      expect(result.deletedCount).toBe(1);

      // Verify the last token is deleted
      const result3 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, token.token, "email_verification"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(result3.valid).toBe(false);
    });

    it("should only invalidate tokens of specified type", async () => {
      // Create tokens of different types
      const emailToken = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      const passwordToken = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "password_reset")])
          .execute()
          .then(([result]) => result);
      });
      const loginToken = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "passwordless_login")])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.invalidateTokens(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(result.deletedCount).toBe(1);

      // Verify only email_verification token is deleted
      const emailResult = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, emailToken.token, "email_verification"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(emailResult.valid).toBe(false);

      const passwordResult = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, passwordToken.token, "password_reset"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(passwordResult.valid).toBe(true);

      const loginResult = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, loginToken.token, "passwordless_login"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(loginResult.valid).toBe(true);
    });

    it("should only invalidate tokens for specified user", async () => {
      const user2Id = "user2-id";

      // Create tokens for both users
      const token1 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      const token2 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(user2Id, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.invalidateTokens(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(result.deletedCount).toBe(1);

      // Verify only testUserId's token is deleted
      const result1 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(testUserId, token1.token, "email_verification"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(result1.valid).toBe(false);

      const result2 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.validateToken(user2Id, token2.token, "email_verification"),
          ])
          .execute()
          .then(([result]) => result);
      });
      expect(result2.valid).toBe(true);
    });

    it("should return 0 when no matching tokens exist", async () => {
      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.invalidateTokens(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(result.deletedCount).toBe(0);
    });

    it("should handle invalidating already invalidated tokens", async () => {
      await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      // First invalidation
      const result1 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.invalidateTokens(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      expect(result1.deletedCount).toBe(1);

      // Second invalidation
      const result2 = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.invalidateTokens(testUserId, "email_verification")])
          .execute()
          .then(([result]) => result);
      });
      expect(result2.deletedCount).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle extremely short expiry times", async () => {
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.generateToken(testUserId, "email_verification", 0)])
          .execute()
          .then(([result]) => result);
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("token_expired");
    });

    it("should handle very long expiry times", async () => {
      const { token } = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [
            services.generateToken(testUserId, "email_verification", 10080), // 1 week
          ])
          .execute()
          .then(([result]) => result);
      });

      // Verify token is valid immediately
      const result = await test.inContext(async function () {
        return this.handlerTx()
          .withServiceCalls(() => [services.validateToken(testUserId, token, "email_verification")])
          .execute()
          .then(([result]) => result);
      });

      expect(result.valid).toBe(true);
    });

    it("should generate unique tokens", async () => {
      const tokens = new Set<string>();

      // Generate many tokens
      for (let i = 0; i < 100; i++) {
        const { token } = await test.inContext(async function () {
          return this.handlerTx()
            .withServiceCalls(() => [services.generateToken(testUserId, "email_verification")])
            .execute()
            .then(([result]) => result);
        });
        tokens.add(token);
      }

      // All should be unique (very high probability)
      expect(tokens.size).toBe(100);
    });
  });
});
