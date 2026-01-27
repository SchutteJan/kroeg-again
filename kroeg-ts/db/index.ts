import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { authSchema, getAuthSchemaSql } from "./auth-schema";
import * as appSchema from "./schema";

let dbPromise: Promise<ReturnType<typeof drizzle>> | null = null;

const createSchemaSql = `
CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  feature_id TEXT UNIQUE NOT NULL,
  zaaknummer TEXT,
  zaaknaam TEXT,
  adres TEXT,
  postcode TEXT,
  zaak_categorie TEXT,
  zaak_specificatie TEXT,
  begindatum DATE,
  einddatum DATE,
  coordinates JSONB,
  status_vergunning TEXT,
  opening_hours JSONB,
  terras_hours JSONB,
  raw_data JSONB,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  current_license_id INTEGER REFERENCES licenses(id),
  name TEXT NOT NULL,
  address TEXT,
  postcode TEXT,
  coordinates JSONB,
  label TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_licenses (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  license_id INTEGER NOT NULL REFERENCES licenses(id),
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  matched_by TEXT
);

CREATE TABLE IF NOT EXISTS curation_decisions (
  id SERIAL PRIMARY KEY,
  license_id INTEGER NOT NULL REFERENCES licenses(id),
  label TEXT NOT NULL,
  sanitized_name TEXT NOT NULL,
  reasoning TEXT,
  decided_by TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  human_verified BOOLEAN NOT NULL DEFAULT FALSE,
  human_verified_by TEXT,
  human_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function initDb() {
  const client = new PGlite("./db/pgdata");
  await client.exec(`${createSchemaSql}\n\n${getAuthSchemaSql()}`);
  return drizzle(client, { schema: { ...appSchema, ...authSchema } });
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}
