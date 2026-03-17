/// <reference types="@solidjs/start/env" />

import type { PostgresPool } from "~/lib/db";

declare namespace App {
  interface RequestEventLocals {
    pool: PostgresPool;
  }
}
