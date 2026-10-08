CREATE SCHEMA IF NOT EXISTS "otp";
--> statement-breakpoint
CREATE TABLE "otp"."one_time_token" (
	"id" varchar(30) NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"type" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"_internalId" bigserial PRIMARY KEY NOT NULL,
	"_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "one_time_token_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "otp"."totp_secret" (
	"id" varchar(30) NOT NULL,
	"userId" text NOT NULL,
	"secret" text NOT NULL,
	"backupCodes" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"_internalId" bigserial PRIMARY KEY NOT NULL,
	"_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "totp_secret_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ott_token" ON "otp"."one_time_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_ott_user_type" ON "otp"."one_time_token" USING btree ("userId","type");--> statement-breakpoint
CREATE INDEX "idx_expires_at" ON "otp"."one_time_token" USING btree ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_totp_user" ON "otp"."totp_secret" USING btree ("userId");