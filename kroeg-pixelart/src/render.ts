import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { loadConfig } from './config.js';
import { DEFAULT_DB_PATH, getTile, listTiles, openDatabase, updateTile } from './db.js';
import { fetchRootTileset } from './googleMaps.js';
import { closeBrowser, getPage } from './renderer/index.js';
import type { RenderConfig, Tile, TileCenter, ViewConfig } from './types.js';

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

function resolveRenderConfig(tileSize: number, viewConfig: ViewConfig, overrides?: RenderConfig): RenderConfig {
  if (overrides) {
    return overrides;
  }

  return {
    width: tileSize,
    height: tileSize,
    cameraElevation: viewConfig.cameraElevation,
    cameraAzimuth: viewConfig.cameraAzimuth,
    viewHeightMeters: viewConfig.viewHeightMeters,
  };
}

function resolveRenderPath(tile: Tile, rendersDir: string): string {
  return tile.renderPath ?? path.join(rendersDir, `${tile.id}.png`);
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

interface RenderSceneParams {
  center: TileCenter;
  viewHeightMeters: number;
  width: number;
  height: number;
  cameraElevation: number;
  cameraAzimuth: number;
  apiKey: string;
}

export async function renderTile(
  tile: Tile,
  config: RenderConfig,
  outputPath: string
): Promise<void> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY environment variable is required for rendering.');
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const page = await getPage();

  const params: RenderSceneParams = {
    center: tile.center,
    viewHeightMeters: config.viewHeightMeters,
    width: config.width,
    height: config.height,
    cameraElevation: config.cameraElevation,
    cameraAzimuth: config.cameraAzimuth,
    apiKey,
  };

  const base64Image = await page.evaluate(
    async (p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = globalThis as any;
      return await win.renderScene(p);
    },
    params
  );

  const buffer = Buffer.from(base64Image, 'base64');
  await sharp(buffer).png().toFile(outputPath);
  // Note: Output dimensions may differ from config due to camera angle adjustment
  // Validation is skipped for now - dimensions depend on elevation angle
}

export async function runRender(options: RenderOptions = {}): Promise<RenderSummary> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
  const rendersDir = resolveDir(options.rendersDir ?? DEFAULT_RENDERS_DIR);
  const config = loadConfig(configPath);
  const renderConfig = resolveRenderConfig(config.tileSize, config.view, options.renderConfig);

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
        console.error(`Failed to render ${tile.id}:`, message);
        if (error instanceof Error && error.stack) {
          console.error(error.stack);
        }
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

// Cleanup browser on process exit
process.on('exit', () => {
  closeBrowser().catch(() => {});
});

process.on('SIGINT', () => {
  closeBrowser()
    .catch(() => {})
    .finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  closeBrowser()
    .catch(() => {})
    .finally(() => process.exit(0));
});
