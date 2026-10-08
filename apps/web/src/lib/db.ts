import { SqlAdapter } from "@fragno-dev/db/adapters/sql";
import { PostgresDialect } from "@fragno-dev/db/dialects";
import { NodePostgresDriverConfig } from "@fragno-dev/db/drivers";
import { Pool } from "pg";
import { getConfig } from "./config";

export type PostgresPool = Pool;

export function createPostgresPool() {
  if (process.env.FRAGNO_INIT_DRY_RUN === "true") {
    return {} as PostgresPool;
  }
  return new Pool({
    connectionString: getConfig().databaseUrl,
  });
}

export function createAdapter(pool: PostgresPool | (() => PostgresPool)) {
  const resolvedPool = typeof pool === "function" ? pool() : pool;

  return new SqlAdapter({
    dialect: new PostgresDialect({ pool: resolvedPool }),
    driverConfig: new NodePostgresDriverConfig(),
  });
}
