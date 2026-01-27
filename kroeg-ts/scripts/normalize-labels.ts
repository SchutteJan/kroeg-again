import { sql } from "drizzle-orm";

import { getDb } from "../db/index";

async function normalizeBarLabels() {
  const db = await getDb();

  const updateLocations = await db.execute(
    sql`
      update locations
      set label = 'bar'
      where label = 'bar (kroeg)'
    `,
  );

  const updateDecisions = await db.execute(
    sql`
      update curation_decisions
      set label = 'bar'
      where label = 'bar (kroeg)'
    `,
  );

  const locationsCount = Number(
    (updateLocations as any)?.count ?? (updateLocations as any)?.rowCount ?? 0,
  );
  const decisionsCount = Number(
    (updateDecisions as any)?.count ?? (updateDecisions as any)?.rowCount ?? 0,
  );

  return {
    locations: locationsCount,
    decisions: decisionsCount,
  };
}

normalizeBarLabels()
  .then((result) => {
    console.log("Normalized labels:", result);
  })
  .catch((error) => {
    console.error("Failed to normalize labels:", error);
    process.exit(1);
  });
