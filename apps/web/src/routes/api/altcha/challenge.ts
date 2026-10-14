import { createAltchaChallenge } from "~/lib/altcha";

export async function GET(): Promise<Response> {
  return Response.json(await createAltchaChallenge(), {
    headers: { "Cache-Control": "no-store" },
  });
}
