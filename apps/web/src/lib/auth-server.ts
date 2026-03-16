import { createAuthFragment } from "@fragno-dev/auth";
import { migrate } from "@fragno-dev/db";
import { createDatabaseAdapter } from "./db";

export function createAuthServer() {
  return createAuthFragment(
    {
      cookieOptions: {
        sameSite: "Lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    {
      databaseAdapter: createDatabaseAdapter(),
    },
  );
}

export type AuthFragment = ReturnType<typeof createAuthServer>;

export const fragment = createAuthServer();

let authServerReadyPromise: Promise<void> | null = null;

export function ensureAuthServerReady() {
  if (process.env.FRAGNO_INIT_DRY_RUN === "true") {
    return Promise.resolve();
  }

  if (!authServerReadyPromise) {
    authServerReadyPromise = migrate(fragment);
  }

  return authServerReadyPromise;
}
