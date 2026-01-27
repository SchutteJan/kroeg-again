import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { loadConfig } from './config.js';
import { DEFAULT_DB_PATH, getTile, listTiles, openDatabase, updateTile } from './db.js';
import { fetchRootTileset } from './googleMaps.js';
import type { RenderConfig, Tile } from './types.js';

export interface RenderOptions {
  dbPath?: string;
  configPath?: string;
  rendersDir?: string;
  tile?: { x: number; y: number };
  all?: boolean;
  limit?: number;
  renderConfig?: RenderConfig;
}

export interface RenderSummary {
  renderedTiles: number;
  skippedTiles: number;
  failedTiles: number;
}

const DEFAULT_CONFIG_PATH = 'config.json';
const DEFAULT_RENDERS_DIR = 'renders';

function resolveDir(value: string): string {
  return path.resolve(process.cwd(), value);
}

function resolveRenderConfig(tileSize: number, overrides?: RenderConfig): RenderConfig {
  if (overrides) {
    return overrides;
  }

  return {
    width: tileSize,
    height: tileSize,
    cameraAngle: 30,
    cameraZoom: 1,
  };
}

function resolveRenderPath(tile: Tile, rendersDir: string): string {
  return tile.renderPath ?? path.join(rendersDir, `${tile.id}.png`);
}

function deriveRenderColor(tile: Tile): { r: number; g: number; b: number } {
  const r = (tile.coord.x * 73 + tile.coord.y * 29) % 256;
  const g = (tile.coord.x * 41 + tile.coord.y * 91) % 256;
  const b = (tile.coord.x * 19 + tile.coord.y * 151) % 256;
  return { r, g, b };
}

async function validateRender(pathname: string, config: RenderConfig): Promise<void> {
  const metadata = await sharp(pathname).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Render output ${pathname} is missing dimensions.`);
  }
  if (metadata.width !== config.width || metadata.height !== config.height) {
    throw new Error(
      `Render output ${pathname} expected ${config.width}x${config.height}, got ${metadata.width}x${metadata.height}.`
    );
  }
}

async function maybeFetchTileset(rendersDir: string): Promise<void> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return;
  }
  const result = await fetchRootTileset({ apiKey });
  await fs.mkdir(rendersDir, { recursive: true });
  const payload = JSON.stringify(
    {
      rootUrl: result.rootUrl,
      session: result.session,
      tileset: result.tileset,
    },
    null,
    2
  );
  await fs.writeFile(path.join(rendersDir, 'tileset.json'), payload);
}

export async function renderTile(
  tile: Tile,
  config: RenderConfig,
  outputPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const color = deriveRenderColor(tile);
  await sharp({
    create: {
      width: config.width,
      height: config.height,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toFile(outputPath);
  await validateRender(outputPath, config);
}

export async function runRender(options: RenderOptions = {}): Promise<RenderSummary> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
  const rendersDir = resolveDir(options.rendersDir ?? DEFAULT_RENDERS_DIR);
  const config = loadConfig(configPath);
  const renderConfig = resolveRenderConfig(config.tileSize, options.renderConfig);

  if (!options.tile && !options.all) {
    throw new Error('Provide either --tile or --all to render tiles.');
  }

  await maybeFetchTileset(rendersDir);

  const db = openDatabase(dbPath);

  let renderedTiles = 0;
  let skippedTiles = 0;
  let failedTiles = 0;

  try {
    let targets: Tile[] = [];

    if (options.tile) {
      const tileId = `tile_${options.tile.x}_${options.tile.y}`;
      const tile = getTile(db, tileId);
      if (!tile) {
        throw new Error(`Tile ${tileId} not found.`);
      }
      targets = [tile];
    } else if (options.all) {
      targets = listTiles(db).filter((tile) => tile.status === 'pending' || tile.status === 'failed');
    }

    for (const tile of targets) {
      if (options.limit !== undefined && renderedTiles + failedTiles >= options.limit) {
        break;
      }

      const outputPath = resolveRenderPath(tile, rendersDir);
      try {
        await renderTile(tile, renderConfig, outputPath);
        updateTile(db, { id: tile.id, status: 'rendered', renderPath: outputPath, errorMessage: null });
        renderedTiles += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        updateTile(db, { id: tile.id, status: 'failed', errorMessage: message });
        failedTiles += 1;
      }
    }

    if (!options.tile && options.all && targets.length === 0) {
      skippedTiles += 1;
    }
  } finally {
    db.close();
  }

  return { renderedTiles, skippedTiles, failedTiles };
}

export function parseTileOption(value?: string): { x: number; y: number } | null {
  if (!value) {
    return null;
  }
  const parts = value.split(',').map((entry) => entry.trim());
  if (parts.length !== 2) {
    throw new Error('Tile option must be in the format x,y.');
  }
  const [x, y] = parts.map((entry) => Number(entry));
  if (Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error('Tile option must contain numbers.');
  }
  return { x, y };
}
