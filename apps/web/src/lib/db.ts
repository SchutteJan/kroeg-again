import { SqlAdapter } from "@fragno-dev/db/adapters/sql";
import { PostgresDialect } from "@fragno-dev/db/dialects";
import { NodePostgresDriverConfig } from "@fragno-dev/db/drivers";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const databaseAdapter = new SqlAdapter({
  dialect: new PostgresDialect({ pool }),
  driverConfig: new NodePostgresDriverConfig(),
});
