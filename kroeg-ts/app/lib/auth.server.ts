import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { authSchema } from "../../db/auth-schema";
import { getDb } from "../../db/index";
import { authBaseOptions } from "./auth-config.server";

let authPromise: Promise<ReturnType<typeof betterAuth>> | null = null;

async function initAuth() {
  const db = await getDb();
  return betterAuth({
    ...authBaseOptions,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
      camelCase: true,
    }),
  });
}

export async function getAuth() {
  if (!authPromise) {
    authPromise = initAuth();
  }
  return authPromise;
}

export async function requireSession(request: Request) {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

export function getApiKeyFromRequest(request: Request) {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) {
    return token;
  }
  return header;
}

export async function requireApiKey(request: Request) {
  const key = getApiKeyFromRequest(request);
  if (!key) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const auth = await getAuth();
  const result = await auth.api.verifyApiKey({
    body: { key },
  });
  if (!result?.valid) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return result;
}

