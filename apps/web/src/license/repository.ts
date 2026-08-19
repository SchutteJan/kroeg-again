import { asc, eq, getTableColumns, gt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { licenses } from "../postgres/license-schema";
import type { LicenseFeature } from "./fetcher";

export type License = typeof licenses.$inferSelect;
export type Coordinates = NonNullable<License["coordinates"]>;

const DEFAULT_PAGE_SIZE = 50;

type Cursor = { id: number };

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64url");
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
}

function toLicenseValues(feature: LicenseFeature) {
  return {
    featureId: String(feature.id),
    coordinates: feature.geometry
      ? ([feature.geometry.coordinates[0], feature.geometry.coordinates[1]] as Coordinates)
      : null,
    propertyId: feature.properties.id,
    zaaknummer: feature.properties.zaaknummer,
    zaaknaam: feature.properties.zaaknaam,
    adres: feature.properties.adres,
    zaakCategorie: feature.properties.zaakCategorie,
    zaakSpecificatie: feature.properties.zaakSpecificatie,
    begindatum: feature.properties.begindatum,
    einddatum: feature.properties.einddatum,
    postcode: feature.properties.postcode,
    statusVergunning: feature.properties.statusVergunning,
    raw: feature,
  };
}

export class LicenseRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async upsertLicense(
    feature: LicenseFeature,
  ): Promise<{ createdOrUpdated: "created" | "updated"; license: License }> {
    const values = toLicenseValues(feature);

    const [row] = await this.db
      .insert(licenses)
      .values(values)
      .onConflictDoUpdate({ target: licenses.featureId, set: values })
      .returning({ ...getTableColumns(licenses), created: sql<boolean>`(xmax = 0)` });

    const { created, ...license } = row!;
    return { createdOrUpdated: created ? "created" : "updated", license };
  }

  async getLicenseById(id: number): Promise<License | null> {
    const [license] = await this.db.select().from(licenses).where(eq(licenses.id, id));
    return license ?? null;
  }

  async getLicenseByFeatureId(featureId: string): Promise<License | null> {
    const [license] = await this.db
      .select()
      .from(licenses)
      .where(eq(licenses.featureId, featureId));
    return license ?? null;
  }

  // Keyset pagination ordered by id. Pass the cursor from the previous page's
  // response to fetch the next page; a null cursor means there are no more pages.
  async listLicenses(
    cursor?: string | null,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<{ items: License[]; cursor: string | null }> {
    const after = cursor ? decodeCursor(cursor) : null;

    const rows = await this.db
      .select()
      .from(licenses)
      .where(after ? gt(licenses.id, after.id) : undefined)
      .orderBy(asc(licenses.id))
      .limit(limit + 1);

    const items = rows.slice(0, limit);
    const nextCursor =
      rows.length > limit ? encodeCursor({ id: items[items.length - 1]!.id }) : null;

    return { items, cursor: nextCursor };
  }
}
