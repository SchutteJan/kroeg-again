import type { Route } from "./+types/curation.uncurated";

import { requireApiKey } from "../../lib/auth.server";
import { getUncuratedLicenses } from "../../lib/queries.server";

export async function loader({ request }: Route.LoaderArgs) {
  // await requireApiKey(request);
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "10");
  const category = url.searchParams.get("category");
  const data = await getUncuratedLicenses({
    limit: Number.isFinite(limit) ? Math.min(limit, 100) : 10,
    category,
  });
  return data;
}
