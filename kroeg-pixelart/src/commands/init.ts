import fs from 'node:fs';
import path from 'node:path';

import { loadConfig } from '../config.js';
import {
  DEFAULT_DB_PATH,
  initDatabase,
  insertQuadrants,
  insertTiles,
  type QuadrantInsertInput,
  type TileInsertInput,
} from '../db.js';
import { generateGrid, generateQuadrants } from '../grid.js';
import type { GeoBounds } from '../types.js';

export interface InitCommandOptions {
  bounds?: string;
  force?: boolean;
  configPath?: string;
  dbPath?: string;
}

export interface InitResult {
  dbPath: string;
  tiles: number;
  quadrants: number;
  bounds: GeoBounds;
}

const DEFAULT_CONFIG_PATH = 'config.json';

function resolveDbPath(dbPath: string): string {
  if (dbPath === ':memory:') {
    return dbPath;
  }
  return path.resolve(process.cwd(), dbPath);
}

export function parseBoundsOption(bounds?: string): GeoBounds | null {
  if (!bounds) {
    return null;
  }

  const parts = bounds.split(',').map((part) => part.trim());
  if (parts.length !== 4) {
    throw new Error('Bounds must be in the format north,south,east,west.');
  }

  const [north, south, east, west] = parts.map((value) => Number(value));
  if ([north, south, east, west].some((value) => Number.isNaN(value))) {
    throw new Error('Bounds values must be numbers.');
  }

  return { north, south, east, west };
}

function removeDatabaseIfExists(dbPath: string): void {
  if (dbPath === ':memory:') {
    return;
  }

  if (!fs.existsSync(dbPath)) {
    return;
  }

  fs.rmSync(dbPath);
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  if (fs.existsSync(walPath)) {
    fs.rmSync(walPath);
  }
  if (fs.existsSync(shmPath)) {
    fs.rmSync(shmPath);
  }
}

export function runInit(options: InitCommandOptions = {}): InitResult {
  const configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
  const config = loadConfig(configPath);
  const boundsOverride = parseBoundsOption(options.bounds);
  const bounds = boundsOverride ?? config.bounds;

  const resolvedDbPath = resolveDbPath(options.dbPath ?? DEFAULT_DB_PATH);

  if (resolvedDbPath !== ':memory:' && fs.existsSync(resolvedDbPath)) {
    if (!options.force) {
      throw new Error(
        `Database already exists at ${resolvedDbPath}. Use --force to overwrite.`
      );
    }
    removeDatabaseIfExists(resolvedDbPath);
  }

  const db = initDatabase(resolvedDbPath);
  const tiles = generateGrid({
    bounds,
    tileSize: config.tileSize,
    zoomLevel: config.zoomLevel,
    viewConfig: config.view,
  });
  const quadrants = generateQuadrants(tiles, { includePartial: true });

  const tileRows: TileInsertInput[] = tiles.map((tile) => ({
    id: tile.id,
    x: tile.coord.x,
    y: tile.coord.y,
    status: tile.status,
    north: tile.bounds.north,
    south: tile.bounds.south,
    east: tile.bounds.east,
    west: tile.bounds.west,
    centerLat: tile.center.lat,
    centerLon: tile.center.lon,
  }));

  const quadrantRows: QuadrantInsertInput[] = quadrants.map((quadrant) => ({
    id: quadrant.id,
    qx: quadrant.qx,
    qy: quadrant.qy,
    tileTl: quadrant.tileTl?.id ?? null,
    tileTr: quadrant.tileTr?.id ?? null,
    tileBl: quadrant.tileBl?.id ?? null,
    tileBr: quadrant.tileBr?.id ?? null,
  }));

  insertTiles(db, tileRows);
  insertQuadrants(db, quadrantRows);
  db.close();

  return {
    dbPath: resolvedDbPath,
    tiles: tiles.length,
    quadrants: quadrants.length,
    bounds,
  };
}
