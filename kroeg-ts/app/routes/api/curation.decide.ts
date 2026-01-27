import type { Route } from "./+types/curation.decide";
import { z } from "zod";

import { requireApiKey } from "../../lib/auth.server";
import { labelValues } from "../../lib/labels";
import { createDecision } from "../../lib/queries.server";

const labelEnum = z.enum(labelValues as [string, ...string[]]);

const payloadSchema = z.object({
  license_id: z.coerce.number(),
  label: labelEnum,
  sanitized_name: z.string().min(1),
  reasoning: z.string().optional(),
});

export async function action({ request }: Route.ActionArgs) {
  // await requireApiKey(request);
  const payload = payloadSchema.parse(await request.json());
  const result = await createDecision({
    licenseId: payload.license_id,
    label: payload.label,
    sanitizedName: payload.sanitized_name,
    reasoning: payload.reasoning,
    decidedBy: "ai_agent",
    decisionType: "ai",
    matchedBy: "ai_agent",
  });

  return {
    decision_id: result.decisionId,
    location_id: result.locationId,
    status: "pending_verification",
    message: "Location created (unpublished), awaiting human verification",
  };
}
