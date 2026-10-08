import { column, idColumn, schema } from "@fragno-dev/db/schema";

export const otpSchema = schema("otp", (s) => {
  return s
    .addTable("totp_secret", (t) => {
      return t
        .addColumn("id", idColumn())
        .addColumn("userId", column("string"))
        .addColumn("secret", column("string"))
        .addColumn("backupCodes", column("string"))
        .addColumn(
          "createdAt",
          column("timestamp").defaultTo((b) => b.now()),
        )
        .createIndex("idx_totp_user", ["userId"], { unique: true });
    })
    .addTable("one_time_token", (t) => {
      return t
        .addColumn("id", idColumn())
        .addColumn("userId", column("string"))
        .addColumn("token", column("string"))
        .addColumn("type", column("string"))
        .addColumn("expiresAt", column("timestamp"))
        .addColumn(
          "createdAt",
          column("timestamp").defaultTo((b) => b.now()),
        )
        .createIndex("idx_ott_token", ["token"], { unique: true })
        .createIndex("idx_ott_user_type", ["userId", "type"])
        .createIndex("idx_expires_at", ["expiresAt"]);
    });
});
