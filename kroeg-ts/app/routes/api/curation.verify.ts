import type { Route } from "./+types/curation.verify";
import { z } from "zod";

import { requireSession } from "../../lib/auth.server";
import { labelValues } from "../../lib/labels";
import { verifyLocation } from "../../lib/queries.server";

const labelEnum = z.enum(labelValues as [string, ...string[]]);

const payloadSchema = z.object({
  location_id: z.coerce.number(),
  approved: z.boolean(),
  override_label: labelEnum.optional(),
  override_name: z.string().optional(),
  override_reasoning: z.string().optional(),
});

export async function action({ request }: Route.ActionArgs) {
  await requireSession(request);
  const payload = payloadSchema.parse(await request.json());
  return verifyLocation({
    locationId: payload.location_id,
    approved: payload.approved,
    overrideLabel: payload.override_label,
    overrideName: payload.override_name,
    overrideReasoning: payload.override_reasoning,
    verifiedBy: "admin",
  });
}
