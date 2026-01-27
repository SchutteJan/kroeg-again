import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  featureId: text("feature_id").notNull().unique(),
  zaaknummer: text("zaaknummer"),
  zaaknaam: text("zaaknaam"),
  adres: text("adres"),
  postcode: text("postcode"),
  zaakCategorie: text("zaak_categorie"),
  zaakSpecificatie: text("zaak_specificatie"),
  begindatum: date("begindatum"),
  einddatum: date("einddatum"),
  coordinates: jsonb("coordinates"),
  statusVergunning: text("status_vergunning"),
  openingHours: jsonb("opening_hours"),
  terrasHours: jsonb("terras_hours"),
  rawData: jsonb("raw_data"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  currentLicenseId: integer("current_license_id").references(() => licenses.id),
  name: text("name").notNull(),
  address: text("address"),
  postcode: text("postcode"),
  coordinates: jsonb("coordinates"),
  label: text("label").notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const locationLicenses = pgTable("location_licenses", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id")
    .notNull()
    .references(() => locations.id),
  licenseId: integer("license_id")
    .notNull()
    .references(() => licenses.id),
  matchedAt: timestamp("matched_at", { withTimezone: true }).defaultNow(),
  matchedBy: text("matched_by"),
});

export const curationDecisions = pgTable("curation_decisions", {
  id: serial("id").primaryKey(),
  licenseId: integer("license_id")
    .notNull()
    .references(() => licenses.id),
  label: text("label").notNull(),
  sanitizedName: text("sanitized_name").notNull(),
  reasoning: text("reasoning"),
  decidedBy: text("decided_by").notNull(),
  decisionType: text("decision_type").notNull(),
  humanVerified: boolean("human_verified").notNull().default(false),
  humanVerifiedBy: text("human_verified_by"),
  humanVerifiedAt: timestamp("human_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

