import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const migrationsFolder = resolve(import.meta.dirname, "../../db/migrations");

export type TestDb = {
  db: NodePgDatabase;
  close: () => Promise<void>;
  truncate: (tables: string[]) => Promise<void>;
};

export const createTestDb = async (): Promise<TestDb> => {
  const pg = await PGlite.create({ extensions: { postgis } });
  await pg.exec("CREATE EXTENSION IF NOT EXISTS postgis;");
  const pgliteDb = drizzle(pg, { casing: "snake_case" });
  await migrate(pgliteDb, { migrationsFolder });
  // Cast: drizzle/pglite and drizzle/node-postgres expose the same PG query
  // builder; pnpm sometimes resolves them to separate type instances, so
  // bridge them here.
  return {
    db: pgliteDb as unknown as NodePgDatabase,
    close: () => pg.close(),
    truncate: async (tables: string[]) => {
      await pgliteDb.execute(
        `truncate table ${tables.map((t) => `"${t}"`).join(", ")} restart identity cascade`,
      );
    },
  };
};
