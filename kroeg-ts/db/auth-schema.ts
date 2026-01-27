import { getAuthTables, type DBFieldAttribute } from "better-auth/db";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { authBaseOptions } from "../app/lib/auth-config.server";

type AuthTableConfig = ReturnType<typeof getAuthTables>;

const authTablesConfig: AuthTableConfig = getAuthTables(authBaseOptions);

function mapFieldToColumn(field: DBFieldAttribute, columnName: string) {
  switch (field.type) {
    case "string":
      return text(columnName);
    case "number":
      return integer(columnName);
    case "boolean":
      return boolean(columnName);
    case "date":
      return timestamp(columnName, { withTimezone: true });
    case "json":
      return jsonb(columnName);
    default:
      if (Array.isArray(field.type)) {
        return jsonb(columnName);
      }
      if (field.type === "string[]" || field.type === "number[]") {
        return jsonb(columnName);
      }
      return text(columnName);
  }
}

function buildAuthSchema() {
  const tableEntries = Object.entries(authTablesConfig).sort(([, a], [, b]) => {
    return (a.order ?? Number.POSITIVE_INFINITY) -
      (b.order ?? Number.POSITIVE_INFINITY);
  });

  const tables: Record<string, any> = {};

  for (const [tableKey, tableConfig] of tableEntries) {
    const tableName = tableConfig.modelName ?? tableKey;
    const columns: Record<string, any> = {
      id: text("id").primaryKey(),
    };

    for (const [fieldKey, field] of Object.entries(tableConfig.fields)) {
      const columnName = field.fieldName ?? fieldKey;
      let column = mapFieldToColumn(field, columnName);

      if (field.references && tables[field.references.model]) {
        column = column.references(() => tables[field.references.model].id, {
          onDelete: field.references.onDelete ?? "cascade",
        });
      }

      if (field.required !== false) {
        column = column.notNull();
      }

      if (field.unique) {
        column = column.unique();
      }

      if (
        field.defaultValue !== undefined &&
        typeof field.defaultValue !== "function"
      ) {
        column = column.default(field.defaultValue as any);
      }

      columns[fieldKey] = column;
    }

    tables[tableName] = pgTable(tableName, columns);
  }

  return tables;
}

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function mapFieldToSql(field: DBFieldAttribute) {
  switch (field.type) {
    case "string":
      return "TEXT";
    case "number":
      return "INTEGER";
    case "boolean":
      return "BOOLEAN";
    case "date":
      return "TIMESTAMPTZ";
    case "json":
      return "JSONB";
    default:
      if (Array.isArray(field.type)) {
        return "JSONB";
      }
      if (field.type === "string[]" || field.type === "number[]") {
        return "JSONB";
      }
      return "TEXT";
  }
}

function serializeDefault(value: unknown) {
  if (typeof value === "number") {
    return `${value}`;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (typeof value === "string") {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return null;
}

export const authSchema = buildAuthSchema();

export function getAuthSchemaSql() {
  const statements: string[] = [];
  const tableEntries = Object.entries(authTablesConfig).sort(([, a], [, b]) => {
    return (a.order ?? Number.POSITIVE_INFINITY) -
      (b.order ?? Number.POSITIVE_INFINITY);
  });

  for (const [tableKey, tableConfig] of tableEntries) {
    const tableName = tableConfig.modelName ?? tableKey;
    const columns: string[] = [`"id" TEXT PRIMARY KEY`];

    for (const [fieldKey, field] of Object.entries(tableConfig.fields)) {
      const columnName = field.fieldName ?? fieldKey;
      const parts = [`${quoteIdent(columnName)} ${mapFieldToSql(field)}`];

      if (field.required !== false) {
        parts.push("NOT NULL");
      }

      if (field.unique) {
        parts.push("UNIQUE");
      }

      if (
        field.defaultValue !== undefined &&
        typeof field.defaultValue !== "function"
      ) {
        const serialized = serializeDefault(field.defaultValue);
        if (serialized !== null) {
          parts.push(`DEFAULT ${serialized}`);
        }
      }

      if (field.references) {
        parts.push(
          `REFERENCES ${quoteIdent(field.references.model)}("id") ON DELETE ${
            (field.references.onDelete ?? "cascade").toUpperCase()
          }`,
        );
      }

      columns.push(parts.join(" "));
    }

    statements.push(
      `CREATE TABLE IF NOT EXISTS ${quoteIdent(tableName)} (\n  ${columns.join(
        ",\n  ",
      )}\n);`,
    );
  }

  return statements.join("\n\n");
}

