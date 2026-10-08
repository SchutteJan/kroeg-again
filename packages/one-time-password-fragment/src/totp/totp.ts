import { defineRoute, defineRoutes } from "@fragno-dev/core";
import { z } from "zod";
import { base32Decode as decode, base32Encode as encode } from "@kroegen/base32";
import type { otpFragmentDefinition } from "..";

export interface TotpConfig {
  issuer?: string;
}

// TOTP secrets end up in otpauth:// URIs, which authenticator apps decode as unpadded RFC 4648.
export function base32Encode(buffer: Uint8Array): string {
  return encode(buffer, "RFC4648", { padding: false });
}

function base32Decode(encoded: string): Uint8Array {
  return decode(encoded, "RFC4648");
}

export async function generateTOTP(
  secret: string,
  timeStep: number = 30,
  digits: number = 6,
): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  return await generateHOTP(secret, counter, digits);
}

export async function generateHOTP(
  secret: string,
  counter: number,
  digits: number = 6,
): Promise<string> {
  const secretBytes = base32Decode(secret);

  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = new Uint8Array(8);
  const counterView = new DataView(counterBuffer.buffer);
  counterView.setBigUint64(0, BigInt(counter), false);

  // Import key for HMAC-SHA1
  // Ensure we have a clean ArrayBuffer by slicing
  const secretBuffer = secretBytes.slice();
  const key = await crypto.subtle.importKey(
    "raw",
    secretBuffer.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  // Generate HMAC-SHA1
  const signature = await crypto.subtle.sign("HMAC", key, counterBuffer.buffer);
  const hmac = new Uint8Array(signature);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binaryCode % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

export async function verifyTOTP(
  secret: string,
  token: string,
  window: number = 1,
): Promise<boolean> {
  const timeStep = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

  // Check current time window and ±window for clock drift tolerance
  for (let i = -window; i <= window; i++) {
    const counter = currentCounter + i;
    const expectedToken = await generateHOTP(secret, counter, 6);
    if (expectedToken === token) {
      return true;
    }
  }

  return false;
}

// Backup code utilities (using same approach as password.ts)
export async function hashBackupCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;

  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(code), "PBKDF2", false, [
    "deriveBits",
  ]);

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(salt);

  return `${saltArray.map((b) => b.toString(16).padStart(2, "0")).join("")}:${iterations}:${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function verifyBackupCode(code: string, storedHash: string): Promise<boolean> {
  const [saltHex, iterationsStr, hashHex] = storedHash.split(":");
  const iterations = parseInt(iterationsStr, 10);

  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const storedHashBytes = new Uint8Array(
    hashHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(code), "PBKDF2", false, [
    "deriveBits",
  ]);

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const hashArray = new Uint8Array(hashBuffer);

  if (hashArray.length !== storedHashBytes.length) {
    return false;
  }

  let isEqual = true;
  for (let i = 0; i < hashArray.length; i++) {
    if (hashArray[i] !== storedHashBytes[i]) {
      isEqual = false;
    }
  }
  return isEqual;
}

export function generateBackupCode(): string {
  // Generate 8-character alphanumeric code
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

export const totpRoutesFactory = defineRoutes<typeof otpFragmentDefinition>().create(
  ({ services }) => {
    return [
      defineRoute({
        method: "POST",
        path: "/totp/enable",
        inputSchema: z.object({
          userId: z.string(),
        }),
        outputSchema: z.object({
          secret: z.string(),
          qrCodeUrl: z.string(),
          backupCodes: z.array(z.string()),
        }),
        errorCodes: ["totp_already_enabled"],
        handler: async function ({ input }, { json, error }) {
          const { userId } = await input.valid();

          // Generate backup codes and hash them in the handler (async work)
          const backupCodes: string[] = [];
          for (let i = 0; i < 10; i++) {
            backupCodes.push(generateBackupCode());
          }
          const hashedBackupCodes = await Promise.all(
            backupCodes.map((code) => hashBackupCode(code)),
          );

          try {
            const [result] = await this.handlerTx()
              .withServiceCalls(() => [services.enableTotp(userId, hashedBackupCodes)])
              .execute();
            return json({ ...result, backupCodes });
          } catch (err) {
            if (err instanceof Error && err.message.includes("already enabled")) {
              return error({ message: "TOTP already enabled", code: "totp_already_enabled" }, 400);
            }
            throw err;
          }
        },
      }),

      defineRoute({
        method: "POST",
        path: "/totp/verify",
        inputSchema: z.object({
          userId: z.string(),
          code: z.string().length(6),
        }),
        outputSchema: z.object({
          valid: z.boolean(),
        }),
        errorCodes: ["totp_not_enabled", "totp_invalid_code"],
        handler: async function ({ input }, { json, error }) {
          const { userId, code } = await input.valid();

          const [result] = await this.handlerTx()
            .withServiceCalls(() => [services.verifyTotp(userId, code)])
            .execute();

          if (!result.valid) {
            return error({ message: "Invalid TOTP code", code: "totp_invalid_code" }, 401);
          }

          return json(result);
        },
      }),

      defineRoute({
        method: "POST",
        path: "/totp/verify-backup",
        inputSchema: z.object({
          userId: z.string(),
          code: z.string().length(8),
        }),
        outputSchema: z.object({
          valid: z.boolean(),
        }),
        errorCodes: ["totp_not_enabled", "backup_code_invalid"],
        handler: async function ({ input }, { json, error }) {
          const { userId, code } = await input.valid();

          // Step 1: Verify the backup code and get the expected/next states
          const [verifyResult] = await this.handlerTx()
            .withServiceCalls(() => [services.verifyBackupCode(userId, code)])
            .execute();

          if (!verifyResult.valid) {
            return error({ message: "Invalid backup code", code: "backup_code_invalid" }, 401);
          }

          // Step 2: Atomically consume with compare-and-swap
          // This fails if another request modified backupCodes between steps
          if (verifyResult.expectedBackupCodes && verifyResult.nextBackupCodes) {
            const [consumeResult] = await this.handlerTx()
              .withServiceCalls(() => [
                services.consumeBackupCode(
                  userId,
                  verifyResult.expectedBackupCodes,
                  verifyResult.nextBackupCodes,
                ),
              ])
              .execute();

            if (!consumeResult.success) {
              return error({ message: "Invalid backup code", code: "backup_code_invalid" }, 401);
            }
          }

          return json({ valid: true });
        },
      }),

      defineRoute({
        method: "POST",
        path: "/totp/disable",
        inputSchema: z.object({
          userId: z.string(),
        }),
        outputSchema: z.object({
          success: z.boolean(),
        }),
        errorCodes: ["totp_not_enabled"],
        handler: async function ({ input }, { json, error }) {
          const { userId } = await input.valid();

          const [success] = await this.handlerTx()
            .withServiceCalls(() => [services.disableTotp(userId)])
            .execute();

          if (!success) {
            return error({ message: "TOTP not enabled", code: "totp_not_enabled" }, 400);
          }

          return json({ success });
        },
      }),

      defineRoute({
        method: "GET",
        path: "/totp/status",
        queryParameters: ["userId"],
        outputSchema: z.object({
          enabled: z.boolean(),
        }),
        errorCodes: [],
        handler: async function ({ query }, { json }) {
          const userId = query.get("userId");

          if (!userId) {
            return json({ enabled: false });
          }

          const [result] = await this.handlerTx()
            .withServiceCalls(() => [services.getTotpStatus(userId)])
            .execute();

          return json(result);
        },
      }),
    ];
  },
);
