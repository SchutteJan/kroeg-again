import {
  bigint,
  date,
  geometry,
  serial,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  integer,
  varchar,
  char,
} from "drizzle-orm/pg-core";
import { timestamps } from "./column-helpers";

export const licenses = pgTable(
  "licenses",
  {
    id: serial("id").primaryKey(),
    featureId: text("feature_id").notNull(),
    coordinates: geometry("coordinates", {
      type: "point",
      mode: "tuple",
      srid: 4326,
    }),
    // License Properties
    propertyId: bigint({ mode: "number" }),
    zaaknummer: integer().notNull(),
    zaaknaam: varchar({ length: 1024 }),
    adres: text().notNull(),
    zaakCategorie: varchar({ length: 256 }),
    zaakSpecificatie: varchar({ length: 256 }),
    begindatum: date(),
    einddatum: date(),
    postcode: char({ length: 6 }),
    statusVergunning: varchar({ length: 32 }),
    raw: jsonb("raw").notNull(),
    // Bookkeeping
    ...timestamps,
  },
  (table) => [uniqueIndex("idx_licenses_feature_id").on(table.featureId)],
);
