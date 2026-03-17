import { createMiddleware } from "@solidjs/start/middleware";
import { createPostgresPool } from "~/lib/db";

const pool = createPostgresPool();

export default createMiddleware({
  onRequest(event) {
    event.locals.pool = pool;
  },
});
