CREATE TABLE "licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_id" text NOT NULL,
	"coordinates" geometry(point),
	"property_id" bigint,
	"zaaknummer" integer NOT NULL,
	"zaaknaam" varchar(1024),
	"adres" text NOT NULL,
	"zaak_categorie" varchar(256),
	"zaak_specificatie" varchar(256),
	"begindatum" date,
	"einddatum" date,
	"postcode" char(6),
	"status_vergunning" varchar(32),
	"raw" jsonb NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_licenses_feature_id" ON "licenses" USING btree ("feature_id");