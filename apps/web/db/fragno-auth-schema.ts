import {
  bigserial,
  bigint,
  foreignKey,
  index,
  integer,
  json,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createId } from "@fragno-dev/db/id";
import { relations } from "drizzle-orm";

export const fragno_db_settings = pgTable(
  "fragno_db_settings",
  {
    id: varchar("id", { length: 30 }).notNull().unique().$defaultFn(() => createId()),
    key: text("key").notNull(),
    value: text("value").notNull(),
    _internalId: bigserial("_internalId", { mode: "number" }).primaryKey().notNull(),
    _version: integer("_version").notNull().default(0),
  },
  (table) => [uniqueIndex("unique_key").on(table.key)],
);

export const fragno_hooks = pgTable(
  "fragno_hooks",
  {
    id: varchar("id", { length: 30 }).notNull().unique().$defaultFn(() => createId()),
    namespace: text("namespace").notNull(),
    hookName: text("hookName").notNull(),
    payload: json("payload").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("maxAttempts").notNull().default(5),
    lastAttemptAt: timestamp("lastAttemptAt"),
    nextRetryAt: timestamp("nextRetryAt"),
    error: text("error"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    nonce: text("nonce").notNull(),
    _internalId: bigserial("_internalId", { mode: "number" }).primaryKey().notNull(),
    _version: integer("_version").notNull().default(0),
  },
  (table) => [
    index("idx_namespace_status_retry").on(table.namespace, table.status, table.nextRetryAt),
    index("idx_nonce").on(table.nonce),
    index("idx_namespace_status_last_attempt").on(table.namespace, table.status, table.lastAttemptAt),
  ],
);

export const fragno_db_outbox = pgTable(
  "fragno_db_outbox",
  {
    id: varchar("id", { length: 30 }).notNull().unique().$defaultFn(() => createId()),
    versionstamp: text("versionstamp").notNull(),
    uowId: text("uowId").notNull(),
    payload: json("payload").notNull(),
    refMap: json("refMap"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    _internalId: bigserial("_internalId", { mode: "number" }).primaryKey().notNull(),
    _version: integer("_version").notNull().default(0),
  },
  (table) => [
    uniqueIndex("idx_outbox_versionstamp").on(table.versionstamp),
    index("idx_outbox_uow").on(table.uowId),
  ],
);

export const fragno_db_outbox_mutations = pgTable(
  "fragno_db_outbox_mutations",
  {
    id: varchar("id", { length: 30 }).notNull().unique().$defaultFn(() => createId()),
    entryVersionstamp: text("entryVersionstamp").notNull(),
    mutationVersionstamp: text("mutationVersionstamp").notNull(),
    uowId: text("uowId").notNull(),
    schema: text("schema").notNull(),
    table: text("table").notNull(),
    externalId: text("externalId").notNull(),
    op: text("op").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    _internalId: bigserial("_internalId", { mode: "number" }).primaryKey().notNull(),
    _version: integer("_version").notNull().default(0),
  },
  (table) => [
    index("idx_outbox_mutations_entry").on(table.entryVersionstamp),
    index("idx_outbox_mutations_key").on(
      table.schema,
      table.table,
      table.externalId,
      table.entryVersionstamp,
    ),
    index("idx_outbox_mutations_uow").on(table.uowId),
  ],
);

export const fragno_db_sync_requests = pgTable(
  "fragno_db_sync_requests",
  {
    id: varchar("id", { length: 30 }).notNull().unique().$defaultFn(() => createId()),
    requestId: text("requestId").notNull(),
    status: text("status").notNull(),
    confirmedCommandIds: json("confirmedCommandIds").notNull(),
    conflictCommandId: text("conflictCommandId"),
    baseVersionstamp: text("baseVersionstamp"),
    lastVersionstamp: text("lastVersionstamp"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    _internalId: bigserial("_internalId", { mode: "number" }).primaryKey().notNull(),
    _version: integer("_version").notNull().default(0),
  },
  (table) => [uniqueIndex("idx_sync_request_id").on(table.requestId)],
);

const schema_simple_auth_db = pgSchema("simple-auth-db");

export const user_simple_auth_db = schema_simple_auth_db.table(
  "user",
  {
    id: varchar("id", { length: 30 }).notNull().unique().$defaultFn(() => createId()),
    email: text("email").notNull(),
    passwordHash: text("passwordHash").notNull(),
    role: text("role").notNull().default("user"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    _internalId: bigserial("_internalId", { mode: "number" }).primaryKey().notNull(),
    _version: integer("_version").notNull().default(0),
  },
  (table) => [
    index("idx_user_email").on(table.email),
    uniqueIndex("idx_user_id").on(table.id),
    index("idx_user_createdAt").on(table.createdAt),
  ],
);

export const session_simple_auth_db = schema_simple_auth_db.table(
  "session",
  {
    id: varchar("id", { length: 30 }).notNull().unique().$defaultFn(() => createId()),
    userId: bigint("userId", { mode: "number" }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    _internalId: bigserial("_internalId", { mode: "number" }).primaryKey().notNull(),
    _version: integer("_version").notNull().default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user_simple_auth_db._internalId],
      name: "fk_session_user_sessionOwner",
    }),
    index("idx_session_user").on(table.userId),
  ],
);

export const user_simple_auth_dbRelations = relations(user_simple_auth_db, ({ many }) => ({
  sessionList: many(session_simple_auth_db, {
    relationName: "session_user",
  }),
}));

export const session_simple_auth_dbRelations = relations(session_simple_auth_db, ({ one }) => ({
  sessionOwner: one(user_simple_auth_db, {
    relationName: "session_user",
    fields: [session_simple_auth_db.userId],
    references: [user_simple_auth_db._internalId],
  }),
}));

export const simple_auth_db_schema = {
  user_simple_auth_db,
  user_simple_auth_dbRelations,
  user: user_simple_auth_db,
  userRelations: user_simple_auth_dbRelations,
  session_simple_auth_db,
  session_simple_auth_dbRelations,
  session: session_simple_auth_db,
  sessionRelations: session_simple_auth_dbRelations,
  schemaVersion: 4,
};
