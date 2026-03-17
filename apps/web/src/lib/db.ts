import { SqlAdapter } from "@fragno-dev/db/adapters/sql";
import { PostgresDialect } from "@fragno-dev/db/dialects";
import { NodePostgresDriverConfig } from "@fragno-dev/db/drivers";
import { Pool } from "pg";

export type PostgresPool = Pool;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return databaseUrl;
  }
  throw new Error("DATABASE_URL is unset and required");
}

export function createPostgresPool() {
  if (process.env.FRAGNO_INIT_DRY_RUN === "true") {
    return {} as PostgresPool;
  }
  return new Pool({
    connectionString: getDatabaseUrl(),
  });
}

export function createAdapter(pool: PostgresPool | (() => PostgresPool)) {
  const resolvedPool = typeof pool === "function" ? pool() : pool;

  return new SqlAdapter({
    dialect: new PostgresDialect({ pool: resolvedPool }),
    driverConfig: new NodePostgresDriverConfig(),
  });
}
