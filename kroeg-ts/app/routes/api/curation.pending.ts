import type { Route } from "./+types/curation.pending";

import { requireSession } from "../../lib/auth.server";
import { getPendingVerifications } from "../../lib/queries.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireSession(request);
  return { items: await getPendingVerifications() };
}
