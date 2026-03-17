CREATE SCHEMA IF NOT EXISTS "simple-auth-db";
--> statement-breakpoint
CREATE TABLE "fragno_db_outbox" (
	"id" varchar(30) NOT NULL,
	"versionstamp" text NOT NULL,
	"uowId" text NOT NULL,
	"payload" json NOT NULL,
	"refMap" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"_internalId" bigserial PRIMARY KEY NOT NULL,
	"_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "fragno_db_outbox_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "fragno_db_settings" (
	"id" varchar(30) NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"_internalId" bigserial PRIMARY KEY NOT NULL,
	"_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "fragno_db_settings_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "fragno_hooks" (
	"id" varchar(30) NOT NULL,
	"namespace" text NOT NULL,
	"hookName" text NOT NULL,
	"payload" json NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 5 NOT NULL,
	"lastAttemptAt" timestamp,
	"nextRetryAt" timestamp,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"nonce" text NOT NULL,
	"_internalId" bigserial PRIMARY KEY NOT NULL,
	"_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "fragno_hooks_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "simple-auth-db"."session" (
	"id" varchar(30) NOT NULL,
	"userId" bigint NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"_internalId" bigserial PRIMARY KEY NOT NULL,
	"_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "session_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "simple-auth-db"."user" (
	"id" varchar(30) NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"_internalId" bigserial PRIMARY KEY NOT NULL,
	"_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "simple-auth-db"."session" ADD CONSTRAINT "fk_session_user_sessionOwner" FOREIGN KEY ("userId") REFERENCES "simple-auth-db"."user"("_internalId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_outbox_versionstamp" ON "fragno_db_outbox" USING btree ("versionstamp");--> statement-breakpoint
CREATE INDEX "idx_outbox_uow" ON "fragno_db_outbox" USING btree ("uowId");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_key" ON "fragno_db_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_namespace_status_retry" ON "fragno_hooks" USING btree ("namespace","status","nextRetryAt");--> statement-breakpoint
CREATE INDEX "idx_nonce" ON "fragno_hooks" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX "idx_session_user" ON "simple-auth-db"."session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_user_email" ON "simple-auth-db"."user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_id" ON "simple-auth-db"."user" USING btree ("id");--> statement-breakpoint
CREATE INDEX "idx_user_createdAt" ON "simple-auth-db"."user" USING btree ("createdAt");
