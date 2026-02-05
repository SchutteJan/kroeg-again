import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';

import type { Tile, TileStatus } from './types.js';

export const DEFAULT_DB_PATH = path.join('data', 'amsterdam.db');

const LATEST_SCHEMA_VERSION = 1;

export interface TileInsertInput {
  id: string;
  x: number;
  y: number;
  status?: TileStatus;
  north: number;
  south: number;
  east: number;
  west: number;
  centerLat: number;
  centerLon: number;
  renderPath?: string;
  outputPath?: string;
  errorMessage?: string;
}

export interface TileUpdateInput {
  id: string;
  status?: TileStatus;
  renderPath?: string | null;
  outputPath?: string | null;
  errorMessage?: string | null;
}

export interface QuadrantInsertInput {
  id: string;
  qx: number;
  qy: number;
  status?: 'pending' | 'generating' | 'complete' | 'failed';
  tileTl?: string | null;
  tileTr?: string | null;
  tileBl?: string | null;
  tileBr?: string | null;
}

export interface QuadrantRecord {
  id: string;
  qx: number;
  qy: number;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  tileTl: string | null;
  tileTr: string | null;
  tileBl: string | null;
  tileBr: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TileRow {
  id: string;
  x: number;
  y: number;
  status: TileStatus;
  north: number;
  south: number;
  east: number;
  west: number;
  center_lat: number;
  center_lon: number;
  render_path: string | null;
  output_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface QuadrantRow {
  id: string;
  qx: number;
  qy: number;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  tile_tl: string | null;
  tile_tr: string | null;
  tile_bl: string | null;
  tile_br: string | null;
  created_at: string;
  updated_at: string;
}

export function openDatabase(dbPath = DEFAULT_DB_PATH): DatabaseType {
  if (dbPath === ':memory:') {
    return new Database(dbPath);
  }

  const resolvedPath = path.resolve(process.cwd(), dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  return new Database(resolvedPath);
}

export function initDatabase(dbPath = DEFAULT_DB_PATH): DatabaseType {
  const db = openDatabase(dbPath);
  migrateDatabase(db);
  return db;
}

export function migrateDatabase(db: DatabaseType): number {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);');

  const row = db.prepare('SELECT version FROM schema_version LIMIT 1;').get() as
    | { version: number }
    | undefined;

  if (!row) {
    db.prepare('INSERT INTO schema_version (version) VALUES (0);').run();
  }

  const currentVersion = row?.version ?? 0;
  if (currentVersion > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${currentVersion} is newer than supported ${LATEST_SCHEMA_VERSION}.`
    );
  }

  const migrations: Array<(dbInstance: DatabaseType) => void> = [
    (dbInstance) => {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS tiles (
          id TEXT PRIMARY KEY,
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          north REAL NOT NULL,
          south REAL NOT NULL,
          east REAL NOT NULL,
          west REAL NOT NULL,
          center_lat REAL NOT NULL,
          center_lon REAL NOT NULL,
          render_path TEXT,
          output_path TEXT,
          error_message TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tiles_status ON tiles(status);
        CREATE INDEX IF NOT EXISTS idx_tiles_coords ON tiles(x, y);

        CREATE TABLE IF NOT EXISTS quadrants (
          id TEXT PRIMARY KEY,
          qx INTEGER NOT NULL,
          qy INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          tile_tl TEXT REFERENCES tiles(id),
          tile_tr TEXT REFERENCES tiles(id),
          tile_bl TEXT REFERENCES tiles(id),
          tile_br TEXT REFERENCES tiles(id),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_quadrants_status ON quadrants(status);

        CREATE TABLE IF NOT EXISTS generation_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quadrant_id TEXT REFERENCES quadrants(id),
          model TEXT NOT NULL,
          prompt TEXT NOT NULL,
          started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          completed_at TEXT,
          success INTEGER,
          error_message TEXT
        );
      `);
    },
  ];

  const transaction = db.transaction(() => {
    let version = currentVersion;
    while (version < LATEST_SCHEMA_VERSION) {
      migrations[version](db);
      version += 1;
      db.prepare('UPDATE schema_version SET version = ?;').run(version);
    }
  });

  transaction();

  const finalVersion = db.prepare('SELECT version FROM schema_version LIMIT 1;').get() as {
    version: number;
  };

  return finalVersion.version;
}

export function insertTiles(db: DatabaseType, tiles: TileInsertInput[]): void {
  if (tiles.length === 0) {
    return;
  }

  const statement = db.prepare(`
    INSERT INTO tiles (
      id,
      x,
      y,
      status,
      north,
      south,
      east,
      west,
      center_lat,
      center_lon,
      render_path,
      output_path,
      error_message
    ) VALUES (
      @id,
      @x,
      @y,
      @status,
      @north,
      @south,
      @east,
      @west,
      @centerLat,
      @centerLon,
      @renderPath,
      @outputPath,
      @errorMessage
    );
  `);

  const insertMany = db.transaction((rows: TileInsertInput[]) => {
    for (const row of rows) {
      statement.run({
        status: row.status ?? 'pending',
        renderPath: row.renderPath ?? null,
        outputPath: row.outputPath ?? null,
        errorMessage: row.errorMessage ?? null,
        ...row,
      });
    }
  });

  insertMany(tiles);
}

export function getTile(db: DatabaseType, id: string): Tile | null {
  const row = db.prepare('SELECT * FROM tiles WHERE id = ?;').get(id) as TileRow | undefined;
  if (!row) {
    return null;
  }

  return mapTileRow(row);
}

export function listTiles(db: DatabaseType, status?: TileStatus): Tile[] {
  const rows = status
    ? (db.prepare('SELECT * FROM tiles WHERE status = ?;').all(status) as TileRow[])
    : (db.prepare('SELECT * FROM tiles;').all() as TileRow[]);

  return rows.map(mapTileRow);
}

export function updateTile(db: DatabaseType, update: TileUpdateInput): void {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id: update.id };

  if (update.status) {
    fields.push('status = @status');
    params.status = update.status;
  }
  if (update.renderPath !== undefined) {
    fields.push('render_path = @renderPath');
    params.renderPath = update.renderPath;
  }
  if (update.outputPath !== undefined) {
    fields.push('output_path = @outputPath');
    params.outputPath = update.outputPath;
  }
  if (update.errorMessage !== undefined) {
    fields.push('error_message = @errorMessage');
    params.errorMessage = update.errorMessage;
  }

  if (fields.length === 0) {
    return;
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');

  db.prepare(`UPDATE tiles SET ${fields.join(', ')} WHERE id = @id;`).run(params);
}

export function insertQuadrants(db: DatabaseType, quadrants: QuadrantInsertInput[]): void {
  if (quadrants.length === 0) {
    return;
  }

  const statement = db.prepare(`
    INSERT INTO quadrants (
      id,
      qx,
      qy,
      status,
      tile_tl,
      tile_tr,
      tile_bl,
      tile_br
    ) VALUES (
      @id,
      @qx,
      @qy,
      @status,
      @tileTl,
      @tileTr,
      @tileBl,
      @tileBr
    );
  `);

  const insertMany = db.transaction((rows: QuadrantInsertInput[]) => {
    for (const row of rows) {
      statement.run({
        status: row.status ?? 'pending',
        tileTl: row.tileTl ?? null,
        tileTr: row.tileTr ?? null,
        tileBl: row.tileBl ?? null,
        tileBr: row.tileBr ?? null,
        ...row,
      });
    }
  });

  insertMany(quadrants);
}

export function getQuadrant(db: DatabaseType, id: string): QuadrantRecord | null {
  const row = db.prepare('SELECT * FROM quadrants WHERE id = ?;').get(id) as
    | QuadrantRow
    | undefined;

  if (!row) {
    return null;
  }

  return mapQuadrantRow(row);
}

export function listQuadrants(
  db: DatabaseType,
  status?: 'pending' | 'generating' | 'complete' | 'failed'
): QuadrantRecord[] {
  const rows = status
    ? (db.prepare('SELECT * FROM quadrants WHERE status = ?;').all(status) as QuadrantRow[])
    : (db.prepare('SELECT * FROM quadrants;').all() as QuadrantRow[]);

  return rows.map(mapQuadrantRow);
}

export function updateQuadrantStatus(
  db: DatabaseType,
  id: string,
  status: 'pending' | 'generating' | 'complete' | 'failed'
): void {
  db.prepare('UPDATE quadrants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;').run(
    status,
    id
  );
}

export function getProgressCounts(db: DatabaseType): Record<TileStatus, number> {
  const rows = db
    .prepare('SELECT status, COUNT(*) as count FROM tiles GROUP BY status;')
    .all() as Array<{ status: TileStatus; count: number }>;

  const base: Record<TileStatus, number> = {
    pending: 0,
    rendered: 0,
    generating: 0,
    complete: 0,
    failed: 0,
  };

  for (const row of rows) {
    base[row.status] = row.count;
  }

  return base;
}

function mapTileRow(row: TileRow): Tile {
  return {
    id: row.id,
    coord: { x: row.x, y: row.y },
    bounds: {
      north: row.north,
      south: row.south,
      east: row.east,
      west: row.west,
    },
    center: {
      lat: row.center_lat,
      lon: row.center_lon,
    },
    status: row.status,
    renderPath: row.render_path ?? undefined,
    outputPath: row.output_path ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapQuadrantRow(row: QuadrantRow): QuadrantRecord {
  return {
    id: row.id,
    qx: row.qx,
    qy: row.qy,
    status: row.status,
    tileTl: row.tile_tl ?? null,
    tileTr: row.tile_tr ?? null,
    tileBl: row.tile_bl ?? null,
    tileBr: row.tile_br ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
