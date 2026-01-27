import { sql } from "drizzle-orm";
import { desc, eq } from "drizzle-orm";

import { getDb } from "../../db/index";
import {
  curationDecisions,
  licenses,
  locationLicenses,
  locations,
} from "../../db/schema";
import type { LocationLabel } from "./labels";

export type Coordinates = { lat: number; lng: number } | null;

async function executeRows<T>(
  db: Awaited<ReturnType<typeof getDb>>,
  query: any,
) {
  const result = await db.execute<T>(query);
  return result?.rows ?? [];
}

export async function getStats() {
  const db = await getDb();
  const totalRows = await executeRows<{ count: number }>(
    db,
    sql`select count(*)::int as count from licenses`,
  );
  const uncuratedRows = await executeRows<{ count: number }>(
    db,
    sql`select count(*)::int as count from licenses l left join curation_decisions d on d.license_id = l.id where d.id is null`,
  );
  const pendingRows = await executeRows<{ count: number }>(
    db,
    sql`select count(*)::int as count from locations where is_published = false`,
  );
  const verifiedRows = await executeRows<{ count: number }>(
    db,
    sql`select count(*)::int as count from locations where is_published = true`,
  );
  const byLabelRows = await executeRows<{ label: string; count: number }>(
    db,
    sql`select label, count(*)::int as count from locations group by label`,
  );
  const totalLicenses = totalRows[0]?.count ?? 0;
  const uncurated = uncuratedRows[0]?.count ?? 0;
  const pending = pendingRows[0]?.count ?? 0;
  const verified = verifiedRows[0]?.count ?? 0;
  const byLabel = byLabelRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.label] = row.count;
    return acc;
  }, {});

  return {
    total_licenses: totalLicenses ?? 0,
    uncurated: uncurated ?? 0,
    curated: Math.max(0, (totalLicenses ?? 0) - (uncurated ?? 0)),
    by_label: byLabel,
    pending_verification: pending ?? 0,
    verified: verified ?? 0,
  };
}

export async function getUncuratedLicenses({
  limit = 10,
  category,
}: {
  limit?: number;
  category?: string | null;
}) {
  const barLikeCategories = [
    // "Additionele horeca",
    "Café",
    // "Café met zaalverhuur",
    // "Culturele horeca",
    // "Eethuis",
    // "Fastfood",
    // "Hotel",
    // "Mengformule",
    // "Nachtzaak",
    // "Restaurant",
    // "Restaurant met zaalverhuur",
    // "Sociëteit",
    // "Zalenverhuur",
  ];
  const db = await getDb();
  const categorySql = sql`coalesce(l.zaak_categorie, l.raw_data->>'zaakCategorie')`;
  const rows = await executeRows<any>(
    db,
    sql`
      select l.*
      from licenses l
      left join curation_decisions d on d.license_id = l.id
      where d.id is null
      and ${categorySql} in (${sql.join(barLikeCategories, sql`, `)})
      ${category ? sql`and ${categorySql} = ${category}` : sql``}
      order by l.last_seen_at desc nulls last
      limit ${limit}
    `,
  );
  const totalRows = await executeRows<{ count: number }>(
    db,
    sql`
      select count(*)::int as count
      from licenses l
      left join curation_decisions d on d.license_id = l.id
      where d.id is null
      and ${categorySql} in (${sql.join(barLikeCategories, sql`, `)})
      ${category ? sql`and ${categorySql} = ${category}` : sql``}
    `,
  );
  const totalUncurated = totalRows[0]?.count ?? 0;

  return {
    items: rows.map((row) => ({
      id: row.id,
      feature_id: row.feature_id,
      zaaknaam: row.zaaknaam,
      adres: row.adres,
      postcode: row.postcode,
      zaak_categorie: row.zaak_categorie ?? row.raw_data?.zaakCategorie ?? null,
      zaak_specificatie:
        row.zaak_specificatie ?? row.raw_data?.zaakSpecificatie ?? null,
      coordinates: row.coordinates,
      opening_hours: row.opening_hours,
      begindatum: row.begindatum,
      einddatum: row.einddatum,
      status_vergunning: row.status_vergunning,
    })),
    total_uncurated: totalUncurated ?? 0,
  };
}

export async function createDecision({
  licenseId,
  label,
  sanitizedName,
  reasoning,
  decidedBy = "ai_agent",
  decisionType = "ai",
  matchedBy = "ai_agent",
}: {
  licenseId: number;
  label: LocationLabel;
  sanitizedName: string;
  reasoning?: string | null;
  decidedBy?: string;
  decisionType?: string;
  matchedBy?: string;
}) {
  const db = await getDb();
  const license = await db.query.licenses.findFirst({
    where: eq(licenses.id, licenseId),
  });
  if (!license) {
    throw new Response("License not found", { status: 404 });
  }

  return db.transaction(async (tx) => {
    const [decision] = await tx
      .insert(curationDecisions)
      .values({
        licenseId,
        label,
        sanitizedName,
        reasoning,
        decidedBy,
        decisionType,
        humanVerified: false,
      })
      .returning({ id: curationDecisions.id });

    const [location] = await tx
      .insert(locations)
      .values({
        currentLicenseId: licenseId,
        name: sanitizedName,
        label,
        address: license.adres ?? null,
        postcode: license.postcode ?? null,
        coordinates: license.coordinates ?? null,
        isPublished: false,
      })
      .returning({ id: locations.id });

    await tx.insert(locationLicenses).values({
      locationId: location.id,
      licenseId,
      matchedBy,
    });

    return {
      decisionId: decision.id,
      locationId: location.id,
    };
  });
}

export async function getPendingVerifications() {
  const db = await getDb();
  const rows = await executeRows<any>(
    db,
    sql`
      select
        l.id as location_id,
        l.name as location_name,
        l.label as location_label,
        l.address as location_address,
        l.is_published as location_is_published,
        lic.id as license_id,
        lic.feature_id,
        lic.zaaknaam,
        lic.adres,
        lic.postcode,
        lic.zaak_categorie,
        lic.zaak_specificatie,
        lic.coordinates,
        lic.opening_hours,
        lic.begindatum,
        lic.einddatum,
        lic.status_vergunning,
        d.id as decision_id,
        d.label as decision_label,
        d.sanitized_name,
        d.reasoning,
        d.created_at as decision_created_at
      from locations l
      join licenses lic on lic.id = l.current_license_id
      left join lateral (
        select *
        from curation_decisions cd
        where cd.license_id = lic.id
        order by cd.id desc
        limit 1
      ) d on true
      where l.is_published = false
      order by d.created_at desc nulls last
    `,
  );

  return rows.map((row) => ({
    location_id: row.location_id,
    decision_id: row.decision_id,
    license: {
      id: row.license_id,
      feature_id: row.feature_id,
      zaaknaam: row.zaaknaam,
      adres: row.adres,
      postcode: row.postcode,
      zaak_categorie: row.zaak_categorie,
      zaak_specificatie: row.zaak_specificatie,
      coordinates: row.coordinates,
      opening_hours: row.opening_hours,
      begindatum: row.begindatum,
      einddatum: row.einddatum,
      status_vergunning: row.status_vergunning,
    },
    location: {
      name: row.location_name,
      label: row.location_label,
      address: row.location_address,
      is_published: row.location_is_published,
    },
    ai_decision: row.decision_id
      ? {
          label: row.decision_label,
          sanitized_name: row.sanitized_name,
          reasoning: row.reasoning,
        }
      : null,
    created_at: row.decision_created_at,
  }));
}

export async function verifyLocation({
  locationId,
  approved,
  overrideLabel,
  overrideName,
  overrideReasoning,
  verifiedBy = "admin",
}: {
  locationId: number;
  approved: boolean;
  overrideLabel?: LocationLabel | null;
  overrideName?: string | null;
  overrideReasoning?: string | null;
  verifiedBy?: string;
}) {
  const db = await getDb();
  const location = await db.query.locations.findFirst({
    where: eq(locations.id, locationId),
  });
  if (!location) {
    throw new Response("Location not found", { status: 404 });
  }

  return db.transaction(async (tx) => {
    if (approved) {
      await tx
        .update(locations)
        .set({ isPublished: true, updatedAt: new Date() })
        .where(eq(locations.id, locationId));

      await tx.execute(
        sql`
          update curation_decisions
          set human_verified = true,
              human_verified_by = ${verifiedBy},
              human_verified_at = now()
          where id = (
            select id
            from curation_decisions
            where license_id = ${location.currentLicenseId}
            order by id desc
            limit 1
          )
        `,
      );

      return {
        location_id: locationId,
        is_published: true,
        label: location.label,
        name: location.name,
      };
    }

    const newLabel = overrideLabel ?? location.label;
    const newName = overrideName ?? location.name;

    await tx
      .update(locations)
      .set({
        isPublished: true,
        label: newLabel,
        name: newName,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, locationId));

    await tx.insert(curationDecisions).values({
      licenseId: location.currentLicenseId!,
      label: newLabel,
      sanitizedName: newName,
      reasoning: overrideReasoning ?? null,
      decidedBy: verifiedBy,
      decisionType: "human_override",
      humanVerified: true,
      humanVerifiedBy: verifiedBy,
      humanVerifiedAt: new Date(),
    });

    return {
      location_id: locationId,
      is_published: true,
      label: newLabel,
      name: newName,
    };
  });
}

export async function getPublishedLocations({
  label,
  limit = 200,
}: {
  label?: string | null;
  limit?: number;
}) {
  const db = await getDb();
  const rows = await executeRows<any>(
    db,
    sql`
      select l.*, lic.zaaknaam, lic.zaak_categorie, lic.zaak_specificatie
      from locations l
      left join licenses lic on lic.id = l.current_license_id
      where l.is_published = true
      ${label ? sql`and l.label = ${label}` : sql``}
      order by l.updated_at desc nulls last
      limit ${limit}
    `,
  );
  return rows;
}

export async function getLocationById(id: number) {
  const db = await getDb();
  const rows = await executeRows<any>(
    db,
    sql`
      select
        l.*,
        lic.zaaknaam,
        lic.zaak_categorie,
        lic.zaak_specificatie,
        lic.status_vergunning,
        lic.opening_hours,
        lic.terras_hours,
        lic.begindatum,
        lic.einddatum,
        lic.feature_id
      from locations l
      left join licenses lic on lic.id = l.current_license_id
      where l.id = ${id}
      limit 1
    `,
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  const decisions = await db
    .select()
    .from(curationDecisions)
    .where(eq(curationDecisions.licenseId, row.current_license_id))
    .orderBy(desc(curationDecisions.id));

  return { location: row, decisions };
}

export async function getAdminLocations() {
  const db = await getDb();
  return executeRows<any>(
    db,
    sql`
      select
        l.*,
        lic.zaaknaam,
        lic.zaak_categorie,
        lic.feature_id
      from locations l
      left join licenses lic on lic.id = l.current_license_id
      order by l.updated_at desc nulls last
    `,
  );
}

export async function getLicenses({ limit = 200 }: { limit?: number }) {
  const db = await getDb();
  return executeRows<any>(
    db,
    sql`
      select *
      from licenses
      order by last_seen_at desc nulls last
      limit ${limit}
    `,
  );
}

function toCoordinates(feature: any): Coordinates {
  const coords = feature?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    return null;
  }
  const [lng, lat] = coords;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }
  return { lat, lng };
}

export async function syncLicenses(sourceUrl: string) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Response("Failed to fetch GeoJSON", { status: 400 });
  }
  const data = await response.json();
  const features: any[] = Array.isArray(data?.features) ? data.features : [];
  const now = new Date();

  const db = await getDb();
  const existing = await db
    .select({ id: licenses.id, featureId: licenses.featureId })
    .from(licenses);
  const existingMap = new Map(existing.map((item) => [item.featureId, item]));

  let added = 0;
  let updated = 0;

  for (const feature of features) {
    const featureId = feature?.id ?? feature?.properties?.feature_id;
    if (!featureId) {
      continue;
    }
    const props = feature?.properties ?? {};
    const coordinates = toCoordinates(feature);
    const values = {
      featureId: String(featureId),
      zaaknummer: props.zaaknummer ?? null,
      zaaknaam: props.zaaknaam ?? null,
      adres: props.adres ?? props.adres_locatie ?? null,
      postcode: props.postcode ?? null,
      zaakCategorie: props.zaak_categorie ?? null,
      zaakSpecificatie: props.zaak_specificatie ?? null,
      begindatum: props.begindatum ?? null,
      einddatum: props.einddatum ?? null,
      coordinates,
      statusVergunning: props.status_vergunning ?? null,
      openingHours: props.openingstijden ?? props.opening_hours ?? null,
      terrasHours: props.terras ?? props.terras_hours ?? null,
      rawData: props,
      lastSeenAt: now,
    };

    const existingRow = existingMap.get(String(featureId));
    if (existingRow) {
      await db
        .update(licenses)
        .set(values)
        .where(eq(licenses.id, existingRow.id));
      updated += 1;
    } else {
      await db.insert(licenses).values({
        ...values,
        firstSeenAt: now,
        lastSeenAt: now,
      });
      added += 1;
    }
  }

  let markedInactive = 0;
  if (features.length > 0) {
    const featureIds = features
      .map((feature) => feature?.id ?? feature?.properties?.feature_id)
      .filter(Boolean)
      .map((id) => String(id));

    if (featureIds.length > 0) {
      const result = await db.execute(
        sql`
          update licenses
          set status_vergunning = 'Inactive',
              last_seen_at = ${now}
          where feature_id not in (${sql.join(featureIds, sql`, `)})
        `,
      );
      markedInactive = Number(result?.count ?? result?.rowCount ?? 0);
    }
  }

  return { added, updated, marked_inactive: markedInactive };
}
