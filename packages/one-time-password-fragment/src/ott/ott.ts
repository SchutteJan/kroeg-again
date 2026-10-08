import { defineRoute, defineRoutes } from "@fragno-dev/core";
import { z } from "zod";
import type { otpFragmentDefinition } from "..";

export interface OttConfig {
  sendEmail?: (params: { to: string; subject: string; body: string }) => Promise<void>;
}

// Token type enum
export const OttType = z.enum(["email_verification", "password_reset", "passwordless_login"]);
export type OttType = z.infer<typeof OttType>;

// Generate 8-character alphanumeric token
export function generateToken(): string {
  let token = "";

  // Convert to base64url-safe characters
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < 8; i++) {
    const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % chars.length;
    token += chars[randomIndex];
  }

  return token;
}

export const ottRoutesFactory = defineRoutes<typeof otpFragmentDefinition>().create(
  ({ services }) => {
    return [
      defineRoute({
        method: "POST",
        path: "/ott/generate",
        inputSchema: z.object({
          userId: z.string(),
          type: OttType,
          durationMinutes: z.number().int().positive().optional().default(15),
        }),
        outputSchema: z.object({
          token: z.string(),
        }),
        errorCodes: [],
        handler: async function ({ input }, { json }) {
          const { userId, type, durationMinutes } = await input.valid();

          const [result] = await this.handlerTx()
            .withServiceCalls(() => [services.generateToken(userId, type, durationMinutes)])
            .execute();

          return json(result);
        },
      }),

      defineRoute({
        method: "POST",
        path: "/ott/validate",
        inputSchema: z.object({
          userId: z.string(),
          token: z.string().length(8),
          type: OttType,
        }),
        outputSchema: z.object({
          valid: z.boolean(),
        }),
        errorCodes: ["token_expired", "token_invalid"],
        handler: async function ({ input }, { json, error }) {
          const { userId, token, type } = await input.valid();

          const [result] = await this.handlerTx()
            .withServiceCalls(() => [services.validateToken(userId, token, type)])
            .execute();

          if (!result.valid && result.error) {
            const errorMessages = {
              token_expired: "Token has expired",
              token_invalid: "Invalid token",
            } as const;

            const statusCodes = {
              token_expired: 410,
              token_invalid: 401,
            } as const;

            return error(
              {
                message: errorMessages[result.error],
                code: result.error,
              },
              statusCodes[result.error],
            );
          }

          return json({ valid: true });
        },
      }),

      defineRoute({
        method: "POST",
        path: "/ott/cleanup",
        inputSchema: z.object({}).optional(),
        outputSchema: z.object({
          deletedCount: z.number(),
        }),
        errorCodes: [],
        handler: async function (_, { json }) {
          const [result] = await this.handlerTx()
            .withServiceCalls(() => [services.cleanupExpiredTokens()])
            .execute();

          return json(result);
        },
      }),

      defineRoute({
        method: "POST",
        path: "/ott/invalidate",
        inputSchema: z.object({
          userId: z.string(),
          type: OttType,
        }),
        outputSchema: z.object({
          deletedCount: z.number(),
        }),
        errorCodes: [],
        handler: async function ({ input }, { json }) {
          const { userId, type } = await input.valid();

          const [result] = await this.handlerTx()
            .withServiceCalls(() => [services.invalidateTokens(userId, type)])
            .execute();

          return json(result);
        },
      }),
    ];
  },
);
