import type { APIEvent } from "@solidjs/start/server";
import { ensureAuthServerReady, fragment } from "~/lib/auth-server";

async function handler(event: APIEvent): Promise<Response> {
  await ensureAuthServerReady();
  return fragment.handler(event.request);
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
