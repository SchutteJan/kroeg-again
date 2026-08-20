import { createAuthFragment } from "@fragno-dev/auth";
import { createAdapter, createPostgresPool, PostgresPool } from "./db";

export function createAuthServer(
  pool: PostgresPool | (() => PostgresPool),
): ReturnType<typeof createAuthFragment> {
  return createAuthFragment(
    {
      cookieOptions: {
        sameSite: "Lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    {
      databaseAdapter: createAdapter(pool),
    },
  );
}

export type AuthFragment = ReturnType<typeof createAuthServer>;

// For the fragno-cli db generate command
export const fragment = createAuthServer(() => createPostgresPool());
