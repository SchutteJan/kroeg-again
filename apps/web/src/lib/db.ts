import { SqlAdapter } from "@fragno-dev/db/adapters/sql";
import { PostgresDialect } from "@fragno-dev/db/dialects";
import { NodePostgresDriverConfig } from "@fragno-dev/db/drivers";
import { Pool } from "pg";

const DRY_RUN_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/postgres";

declare global {
  var __kroegPgPool__: Pool | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return databaseUrl;
  }

  if (process.env.FRAGNO_INIT_DRY_RUN === "true") {
    return DRY_RUN_DATABASE_URL;
  }

  throw new Error("DATABASE_URL is required");
}

function getPool() {
  if (!globalThis.__kroegPgPool__) {
    globalThis.__kroegPgPool__ = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  return globalThis.__kroegPgPool__;
}

export function createDatabaseAdapter() {
  return new SqlAdapter({
    dialect: new PostgresDialect({
      pool: getPool(),
    }),
    driverConfig: new NodePostgresDriverConfig(),
  });
}
