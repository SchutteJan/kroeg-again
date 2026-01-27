import type { Route } from "./+types/licenses.search";
import { sql } from "drizzle-orm";

import { requireApiKey } from "../../lib/auth.server";
import { getDb } from "../../../db/index";

export async function loader({ request }: Route.LoaderArgs) {
  await requireApiKey(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const featureId = url.searchParams.get("feature_id")?.trim();
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(limitRaw, 200) : 50;

  const db = await getDb();
  const querySql = query
    ? sql`and (
        l.zaaknaam ilike ${`%${query}%`}
        or l.adres ilike ${`%${query}%`}
        or l.postcode ilike ${`%${query}%`}
        or l.raw_data->>'zaaknaam' ilike ${`%${query}%`}
        or l.raw_data->>'adres' ilike ${`%${query}%`}
        or l.raw_data->>'postcode' ilike ${`%${query}%`}
      )`
    : sql``;

  const featureSql = featureId ? sql`and l.feature_id = ${featureId}` : sql``;

  const rows = await db.execute(
    sql`
      select l.*
      from licenses l
      where 1 = 1
      ${featureSql}
      ${querySql}
      order by l.last_seen_at desc nulls last
      limit ${limit}
    `,
  );

  return {
    items: (rows?.rows ?? []).map((row: any) => ({
      id: row.id,
      feature_id: row.feature_id,
      zaaknaam: row.zaaknaam ?? row.raw_data?.zaaknaam ?? null,
      adres: row.adres ?? row.raw_data?.adres ?? null,
      postcode: row.postcode ?? row.raw_data?.postcode ?? null,
      zaak_categorie: row.zaak_categorie ?? row.raw_data?.zaakCategorie ?? null,
      zaak_specificatie:
        row.zaak_specificatie ?? row.raw_data?.zaakSpecificatie ?? null,
      coordinates: row.coordinates,
      status_vergunning:
        row.status_vergunning ?? row.raw_data?.statusVergunning ?? null,
      begindatum: row.begindatum,
      einddatum: row.einddatum,
    })),
  };
}
