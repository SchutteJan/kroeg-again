import type { Route } from "./+types/curation.stats";

import { getStats } from "../../lib/queries.server";

export async function loader({}: Route.LoaderArgs) {
  return getStats();
}

