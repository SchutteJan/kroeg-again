import type { APIEvent } from "@solidjs/start/server";
import { createAuthServer } from "~/lib/auth-server";

async function handler(event: APIEvent): Promise<Response> {
  const fragment = createAuthServer(event.locals.pool);
  return fragment.handler(event.request);
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
