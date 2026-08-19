import { createMiddleware } from "@solidjs/start/middleware";
import { drizzle } from "drizzle-orm/node-postgres";
import { createPostgresPool } from "~/lib/db";

const pool = createPostgresPool();

export default createMiddleware({
  onRequest(event) {
    event.locals.pool = pool;
    event.locals.db = drizzle(pool, { casing: "snake_case" });
  },
});
