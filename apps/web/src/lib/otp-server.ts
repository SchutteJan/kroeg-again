import { createOtpFragment } from "@kroegen/one-time-password-fragment";
import { createAdapter, createPostgresPool, PostgresPool } from "./db";

export function createOtpServer(
  pool: PostgresPool | (() => PostgresPool),
): ReturnType<typeof createOtpFragment> {
  return createOtpFragment(
    {},
    {
      databaseAdapter: createAdapter(pool),
    },
  );
}

export type OtpFragment = ReturnType<typeof createOtpServer>;

// For the fragno-cli db generate command
export const fragment = createOtpServer(() => createPostgresPool());
