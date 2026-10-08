import { defineFragment, instantiate } from "@fragno-dev/core";
import { createClientBuilder, type FragnoPublicClientConfig } from "@fragno-dev/core/client";
import { withDatabase, type FragnoPublicConfigWithDatabase } from "@fragno-dev/db";
import { otpSchema } from "./schema";
import { ottRoutesFactory, type OttConfig, OttType } from "./ott/ott";
import { totpRoutesFactory, type TotpConfig } from "./totp/totp";
import { generateToken } from "./ott/ott";
import { base32Encode, verifyBackupCode, verifyTOTP } from "./totp/totp";

export interface OtpFragmentConfig extends OttConfig, TotpConfig {
  issuer?: string;
}

export const otpFragmentDefinition = defineFragment<OtpFragmentConfig>("one-time-password")
  .extend(withDatabase(otpSchema))
  .providesBaseService(({ defineService, config }) => {
    return defineService({
      // OTT services
      generateToken: function (userId: string, type: OttType, durationMinutes: number = 15) {
        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.find("one_time_token", (b) =>
              b.whereIndex("idx_ott_user_type", (eb) =>
                eb.and(eb("userId", "=", userId), eb("type", "=", type)),
              ),
            ),
          )
          .mutate(({ uow, retrieveResult: [existingTokens] }) => {
            for (const existingToken of existingTokens) {
              uow.delete("one_time_token", existingToken.id);
            }

            const token = generateToken();
            const now = Date.now();
            const expiresAt = new Date(now + durationMinutes * 60 * 1000);

            uow.create("one_time_token", {
              userId,
              token: token.toUpperCase(),
              type,
              expiresAt,
            });

            return { token };
          })
          .build();
      },

      getAll: function () {
        return this.serviceTx(otpSchema)
          .retrieve((uow) => uow.find("one_time_token", (b) => b.whereIndex("primary", () => true)))
          .build();
      },

      validateToken: function (userId: string, tokenString: string, type: OttType) {
        const normalizedToken = tokenString.toUpperCase();

        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.find("one_time_token", (b) =>
              b.whereIndex("idx_ott_user_type", (eb) =>
                eb.and(eb("userId", "=", userId), eb("type", "=", type)),
              ),
            ),
          )
          .mutate(({ uow, retrieveResult: [tokens] }) => {
            const token = tokens.find((t) => t.token === normalizedToken);

            if (!token) {
              return {
                valid: false,
                error: "token_invalid" as const,
              };
            }

            // Check expiry
            const now = new Date();

            if (token.expiresAt.getTime() < now.getTime()) {
              uow.delete("one_time_token", token.id);
              return {
                valid: false,
                error: "token_expired" as const,
              };
            }

            uow.delete("one_time_token", token.id);
            return {
              valid: true,
            };
          })
          .build();
      },

      cleanupExpiredTokens: function () {
        const now = new Date();

        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.find("one_time_token", (b) =>
              b.whereIndex("idx_expires_at", (eb) => eb("expiresAt", "<", now)),
            ),
          )
          .mutate(({ uow, retrieveResult: [expiredTokens] }) => {
            for (const expiredToken of expiredTokens) {
              uow.delete("one_time_token", expiredToken.id);
            }

            return { deletedCount: expiredTokens.length };
          })
          .build();
      },

      invalidateTokens: function (userId: string, type: OttType) {
        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.find("one_time_token", (b) =>
              b.whereIndex("idx_ott_user_type", (eb) =>
                eb.and(eb("userId", "=", userId), eb("type", "=", type)),
              ),
            ),
          )
          .mutate(({ uow, retrieveResult: [tokens] }) => {
            for (const token of tokens) {
              uow.delete("one_time_token", token.id);
            }

            return { deletedCount: tokens.length };
          })
          .build();
      },

      // TOTP services
      enableTotp: function (userId: string, hashedBackupCodes: string[]) {
        const secretBytes = crypto.getRandomValues(new Uint8Array(20));
        const secret = base32Encode(secretBytes);

        const issuer = config?.issuer || "SimpleAuth";
        const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userId)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.findFirst("totp_secret", (b) =>
              b.whereIndex("idx_totp_user", (eb) => eb("userId", "=", userId)),
            ),
          )
          .mutate(({ uow, retrieveResult: [existing] }) => {
            if (existing) {
              throw new Error("TOTP already enabled for this user");
            }

            uow.create("totp_secret", {
              userId,
              secret,
              backupCodes: JSON.stringify(hashedBackupCodes),
            });

            return {
              secret,
              qrCodeUrl,
            };
          })
          .build();
      },

      verifyTotp: function (userId: string, code: string) {
        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.findFirst("totp_secret", (b) =>
              b.whereIndex("idx_totp_user", (eb) => eb("userId", "=", userId)),
            ),
          )
          .transformRetrieve(async ([totpRecord]) => {
            if (!totpRecord) {
              return { valid: false };
            }

            const valid = await verifyTOTP(totpRecord.secret, code, 1);
            return { valid };
          })
          .build();
      },

      verifyBackupCode: function (userId: string, code: string) {
        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.findFirst("totp_secret", (b) =>
              b.whereIndex("idx_totp_user", (eb) => eb("userId", "=", userId)),
            ),
          )
          .transformRetrieve(async ([totpRecord]) => {
            if (!totpRecord) {
              return { valid: false };
            }

            const backupCodes: string[] = JSON.parse(totpRecord.backupCodes);

            for (let i = 0; i < backupCodes.length; i++) {
              const isValid = await verifyBackupCode(code.toUpperCase(), backupCodes[i]);
              if (isValid) {
                const nextBackupCodes = [...backupCodes];
                nextBackupCodes.splice(i, 1);
                return {
                  valid: true,
                  expectedBackupCodes: backupCodes,
                  nextBackupCodes,
                };
              }
            }

            return { valid: false };
          })
          .build();
      },

      consumeBackupCode: function (
        userId: string,
        expectedBackupCodes: string[],
        nextBackupCodes: string[],
      ) {
        const expectedJson = JSON.stringify(expectedBackupCodes);

        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.findFirst("totp_secret", (b) =>
              b.whereIndex("idx_totp_user", (eb) => eb("userId", "=", userId)),
            ),
          )
          .mutate(({ uow, retrieveResult: [totpRecord] }) => {
            if (!totpRecord) {
              return { success: false };
            }

            // Compare-and-swap: only update if current state matches expected snapshot
            if (totpRecord.backupCodes !== expectedJson) {
              return { success: false };
            }

            uow.update("totp_secret", totpRecord.id, (b) =>
              b.set({ backupCodes: JSON.stringify(nextBackupCodes) }).check(),
            );

            return { success: true };
          })
          .build();
      },

      disableTotp: function (userId: string) {
        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.findFirst("totp_secret", (b) =>
              b.whereIndex("idx_totp_user", (eb) => eb("userId", "=", userId)),
            ),
          )
          .mutate(({ uow, retrieveResult: [totpRecord] }) => {
            if (!totpRecord) {
              return false;
            }

            uow.delete("totp_secret", totpRecord.id);
            return true;
          })
          .build();
      },

      getTotpStatus: function (userId: string) {
        return this.serviceTx(otpSchema)
          .retrieve((uow) =>
            uow.findFirst("totp_secret", (b) =>
              b.whereIndex("idx_totp_user", (eb) => eb("userId", "=", userId)),
            ),
          )
          .mutate(({ retrieveResult: [totpRecord] }) => {
            return {
              enabled: !!totpRecord,
            };
          })
          .build();
      },
    });
  })
  .build();

export function createOtpFragment(
  config: OtpFragmentConfig = {},
  fragnoConfig: FragnoPublicConfigWithDatabase,
) {
  return instantiate(otpFragmentDefinition)
    .withConfig(config)
    .withOptions(fragnoConfig)
    .withRoutes([ottRoutesFactory, totpRoutesFactory])
    .build();
}

export function createOtpFragmentClients(fragnoConfig: FragnoPublicClientConfig) {
  const b = createClientBuilder(otpFragmentDefinition, fragnoConfig, [
    ottRoutesFactory,
    totpRoutesFactory,
  ]);

  return {
    // OTT hooks
    useGenerateToken: b.createMutator("POST", "/ott/generate"),
    useValidateToken: b.createMutator("POST", "/ott/validate"),
    useCleanupTokens: b.createMutator("POST", "/ott/cleanup"),
    useInvalidateTokens: b.createMutator("POST", "/ott/invalidate"),

    // TOTP hooks
    useEnableTotp: b.createMutator("POST", "/totp/enable"),
    useVerifyTotp: b.createMutator("POST", "/totp/verify"),
    useVerifyBackupCode: b.createMutator("POST", "/totp/verify-backup"),
    useDisableTotp: b.createMutator("POST", "/totp/disable"),
    useTotpStatus: b.createHook("/totp/status"),
  };
}

export type { FragnoRouteConfig } from "@fragno-dev/core/api";
export { OttType } from "./ott/ott";
export type { OttType as OttTypeValue } from "./ott/ott";
