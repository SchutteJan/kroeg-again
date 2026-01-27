import type { Route } from "./+types/licenses.sync";
import { z } from "zod";

import { requireSession } from "../../lib/auth.server";
import { syncLicenses } from "../../lib/queries.server";

const payloadSchema = z.object({
  source_url: z.string().url(),
});

export async function action({ request }: Route.ActionArgs) {
  await requireSession(request);
  const payload = payloadSchema.parse(await request.json());
  return syncLicenses(payload.source_url);
}
