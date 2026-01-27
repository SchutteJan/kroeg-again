import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { loadConfig } from './config.js';
import {
  DEFAULT_DB_PATH,
  getQuadrant,
  getTile,
  listQuadrants,
  listTiles,
  openDatabase,
  updateQuadrantStatus,
  updateTile,
  type QuadrantRecord,
} from './db.js';
import {
  buildInfillImage,
  buildInfillMask,
  buildNeighborMap,
  determineTemplateShape,
  getNeighborInfo,
  getTemplateNeighborStatus,
  validateTemplateNeighbors,
  type QuadrantPosition,
  type TileImageSource,
} from './infill.js';
import { uploadToGcs, type StorageLike } from './gcs.js';
import { downloadImage, requestOxenEdit } from './oxen.js';
import type { AppConfig, Tile } from './types.js';

export type GenerationStrategy = 'spiral' | 'random' | 'row-by-row';

export interface GenerateOptions {
  dbPath?: string;
  configPath?: string;
  rendersDir?: string;
  tilesDir?: string;
  workDir?: string;
  overlapPixels?: number;
  strategy?: GenerationStrategy;
  limit?: number;
  continue?: boolean;
  tile?: { x: number; y: number };
  quadrant?: { qx: number; qy: number };
  storage?: StorageLike;
  fetcher?: typeof fetch;
}

export interface GenerateSummary {
  generatedQuadrants: number;
  generatedTiles: number;
  skippedQuadrants: number;
  failedQuadrants: number;
}

interface TilePaths {
  renderPath: string;
  outputPath: string;
}

interface QuadrantPlan {
  record: QuadrantRecord;
  tileTl: Tile | null;
  tileTr: Tile | null;
  tileBl: Tile | null;
  tileBr: Tile | null;
}

interface GenerationContext {
  config: AppConfig;
  storage?: StorageLike;
  fetcher?: typeof fetch;
  rendersDir: string;
  tilesDir: string;
  workDir: string;
  overlapPixels: number;
}

interface TileMaps {
  byId: Map<string, Tile>;
  byCoord: Map<string, Tile>;
}

const DEFAULT_CONFIG_PATH = 'config.json';
const DEFAULT_RENDERS_DIR = 'renders';
const DEFAULT_TILES_DIR = 'tiles';
const DEFAULT_WORK_DIR = path.join('output', 'generation');
const DEFAULT_OVERLAP_PIXELS = 64;

const PROMPT_TEMPLATE =
  'Convert the image to isometric pixel art with visible pixels and a warm autumn palette.\n' +
  'Include Dutch architecture, gabled roofs, canals, and small details like people, cars, and boats.';

const POSITION_ORDER: QuadrantPosition[] = ['tl', 'tr', 'bl', 'br'];

const POSITION_DELTAS: Record<QuadrantPosition, { dx: number; dy: number }> = {
  tl: { dx: 0, dy: 0 },
  tr: { dx: 1, dy: 0 },
  bl: { dx: 0, dy: 1 },
  br: { dx: 1, dy: 1 },
};

function resolveDir(value: string): string {
  return path.resolve(process.cwd(), value);
}

function resolveTilePaths(tile: Tile, rendersDir: string, tilesDir: string): TilePaths {
  const filename = `${tile.id}.png`;
  return {
    renderPath: tile.renderPath ?? path.join(rendersDir, filename),
    outputPath: tile.outputPath ?? path.join(tilesDir, filename),
  };
}

function buildTileMaps(tiles: Tile[]): TileMaps {
  const byId = new Map<string, Tile>();
  const byCoord = new Map<string, Tile>();

  for (const tile of tiles) {
    byId.set(tile.id, tile);
    byCoord.set(`${tile.coord.x}_${tile.coord.y}`, tile);
  }

  return { byId, byCoord };
}

function applyTileUpdate(tile: Tile, updates: Partial<Tile>): void {
  Object.assign(tile, updates);
}

function toTileImageSource(tile: Tile, paths: TilePaths): TileImageSource {
  return {
    id: tile.id,
    coord: tile.coord,
    status: tile.status,
    renderPath: paths.renderPath,
    outputPath: paths.outputPath,
  };
}

function buildQuadrantPlan(record: QuadrantRecord, tileMap: Map<string, Tile>): QuadrantPlan {
  return {
    record,
    tileTl: record.tileTl ? tileMap.get(record.tileTl) ?? null : null,
    tileTr: record.tileTr ? tileMap.get(record.tileTr) ?? null : null,
    tileBl: record.tileBl ? tileMap.get(record.tileBl) ?? null : null,
    tileBr: record.tileBr ? tileMap.get(record.tileBr) ?? null : null,
  };
}

function collectQuadrantTiles(plan: QuadrantPlan): Array<{ position: QuadrantPosition; tile: Tile }>{
  const entries: Array<{ position: QuadrantPosition; tile: Tile }> = [];

  if (plan.tileTl) {
    entries.push({ position: 'tl', tile: plan.tileTl });
  }
  if (plan.tileTr) {
    entries.push({ position: 'tr', tile: plan.tileTr });
  }
  if (plan.tileBl) {
    entries.push({ position: 'bl', tile: plan.tileBl });
  }
  if (plan.tileBr) {
    entries.push({ position: 'br', tile: plan.tileBr });
  }

  return entries;
}

function quadrantHasIncompleteTiles(plan: QuadrantPlan): boolean {
  return [plan.tileTl, plan.tileTr, plan.tileBl, plan.tileBr].some(
    (tile) => tile && tile.status !== 'complete'
  );
}

function quadrantAllTilesComplete(plan: QuadrantPlan): boolean {
  return [plan.tileTl, plan.tileTr, plan.tileBl, plan.tileBr].every(
    (tile) => !tile || tile.status === 'complete'
  );
}

function canRetryQuadrant(plan: QuadrantPlan, options: GenerateOptions): boolean {
  if (options.continue) {
    return plan.record.status !== 'complete';
  }
  return plan.record.status === 'pending';
}

function hasAnyCompletedTile(tiles: Tile[]): boolean {
  return tiles.some((tile) => tile.status === 'complete');
}

function isQuadrantEligible(plan: QuadrantPlan, tileByCoord: Map<string, Tile>): boolean {
  const tiles = collectQuadrantTiles(plan);
  if (tiles.length === 0) {
    return false;
  }

  const coordsInQuadrant = new Set(tiles.map((entry) => `${entry.tile.coord.x}_${entry.tile.coord.y}`));

  const edgeNeedsNeighbor = {
    top: false,
    right: false,
    bottom: false,
    left: false,
  };
  const edgeHasComplete = {
    top: false,
    right: false,
    bottom: false,
    left: false,
  };

  for (const entry of tiles) {
    const { x, y } = entry.tile.coord;
    const neighbors: Array<{ edge: 'top' | 'right' | 'bottom' | 'left'; x: number; y: number }> = [
      { edge: 'left', x: x - 1, y },
      { edge: 'right', x: x + 1, y },
      { edge: 'top', x, y: y - 1 },
      { edge: 'bottom', x, y: y + 1 },
    ];

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x}_${neighbor.y}`;
      if (coordsInQuadrant.has(neighborKey)) {
        continue;
      }
      const neighborTile = tileByCoord.get(neighborKey);
      if (!neighborTile) {
        continue;
      }
      edgeNeedsNeighbor[neighbor.edge] = true;
      if (neighborTile.status === 'complete') {
        edgeHasComplete[neighbor.edge] = true;
      }
    }
  }

  return (Object.keys(edgeNeedsNeighbor) as Array<keyof typeof edgeNeedsNeighbor>).every(
    (edge) => !edgeNeedsNeighbor[edge] || edgeHasComplete[edge]
  );
}

function isTemplateValid(
  plan: QuadrantPlan,
  templateTiles: TileImageSource[],
  allTiles: TileImageSource[]
): boolean {
  const positions: QuadrantPosition[] = [];
  for (const entry of collectQuadrantTiles(plan)) {
    if (entry.tile.status !== 'complete') {
      const position = POSITION_ORDER.find((candidate) => {
        const delta = POSITION_DELTAS[candidate];
        return (
          entry.tile.coord.x === plan.record.qx * 2 + delta.dx &&
          entry.tile.coord.y === plan.record.qy * 2 + delta.dy
        );
      });
      if (position) {
        positions.push(position);
      }
    }
  }

  if (positions.length === 0) {
    return true;
  }

  const shape = determineTemplateShape(positions);
  const neighborStatus = getTemplateNeighborStatus(allTiles, templateTiles);
  return validateTemplateNeighbors(shape, neighborStatus);
}

function resolveQuadrantPosition(plan: QuadrantPlan, tile: Tile): QuadrantPosition | null {
  for (const position of POSITION_ORDER) {
    const delta = POSITION_DELTAS[position];
    if (tile.coord.x === plan.record.qx * 2 + delta.dx && tile.coord.y === plan.record.qy * 2 + delta.dy) {
      return position;
    }
  }
  return null;
}

function buildSpiralOrder(plans: QuadrantPlan[]): QuadrantPlan[] {
  if (plans.length === 0) {
    return [];
  }

  const qxValues = plans.map((plan) => plan.record.qx);
  const qyValues = plans.map((plan) => plan.record.qy);
  const minX = Math.min(...qxValues);
  const maxX = Math.max(...qxValues);
  const minY = Math.min(...qyValues);
  const maxY = Math.max(...qyValues);

  const centerX = Math.round((minX + maxX) / 2);
  const centerY = Math.round((minY + maxY) / 2);

  const planMap = new Map<string, QuadrantPlan>();
  for (const plan of plans) {
    planMap.set(`${plan.record.qx}_${plan.record.qy}`, plan);
  }

  const ordered: QuadrantPlan[] = [];
  const maxRadius = Math.max(
    Math.abs(minX - centerX),
    Math.abs(maxX - centerX),
    Math.abs(minY - centerY),
    Math.abs(maxY - centerY)
  );

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    const left = centerX - radius;
    const right = centerX + radius;
    const top = centerY - radius;
    const bottom = centerY + radius;

    for (let x = left; x <= right; x += 1) {
      const key = `${x}_${top}`;
      const plan = planMap.get(key);
      if (plan) {
        ordered.push(plan);
        planMap.delete(key);
      }
    }

    for (let y = top + 1; y <= bottom; y += 1) {
      const key = `${right}_${y}`;
      const plan = planMap.get(key);
      if (plan) {
        ordered.push(plan);
        planMap.delete(key);
      }
    }

    for (let x = right - 1; x >= left; x -= 1) {
      const key = `${x}_${bottom}`;
      const plan = planMap.get(key);
      if (plan) {
        ordered.push(plan);
        planMap.delete(key);
      }
    }

    for (let y = bottom - 1; y > top; y -= 1) {
      const key = `${left}_${y}`;
      const plan = planMap.get(key);
      if (plan) {
        ordered.push(plan);
        planMap.delete(key);
      }
    }
  }

  return ordered;
}

function shufflePlans(plans: QuadrantPlan[]): QuadrantPlan[] {
  const copy = [...plans];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function orderQuadrants(
  plans: QuadrantPlan[],
  strategy: GenerationStrategy
): QuadrantPlan[] {
  switch (strategy) {
    case 'row-by-row':
      return [...plans].sort((a, b) => {
        if (a.record.qy !== b.record.qy) {
          return a.record.qy - b.record.qy;
        }
        return a.record.qx - b.record.qx;
      });
    case 'random':
      return shufflePlans(plans);
    case 'spiral':
    default:
      return buildSpiralOrder(plans);
  }
}

function resolveDirs(options: GenerateOptions): {
  rendersDir: string;
  tilesDir: string;
  workDir: string;
} {
  return {
    rendersDir: resolveDir(options.rendersDir ?? DEFAULT_RENDERS_DIR),
    tilesDir: resolveDir(options.tilesDir ?? DEFAULT_TILES_DIR),
    workDir: resolveDir(options.workDir ?? DEFAULT_WORK_DIR),
  };
}

async function ensureDirs(...paths: string[]): Promise<void> {
  await Promise.all(paths.map((target) => fs.mkdir(target, { recursive: true })));
}

async function splitQuadrantImage(
  sourcePath: string,
  tileSize: number,
  outputs: Array<{ position: QuadrantPosition; outputPath: string }>
): Promise<void> {
  const image = sharp(sourcePath);

  const tasks = outputs.map(async ({ position, outputPath }) => {
    const delta = POSITION_DELTAS[position];
    const left = delta.dx * tileSize;
    const top = delta.dy * tileSize;

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await image
      .clone()
      .extract({ left, top, width: tileSize, height: tileSize })
      .png()
      .toFile(outputPath);
  });

  await Promise.all(tasks);
}

async function generateSingleTile(
  tile: Tile,
  context: GenerationContext
): Promise<{ generated: boolean }>{
  const paths = resolveTilePaths(tile, context.rendersDir, context.tilesDir);
  await fs.stat(paths.renderPath);

  await ensureDirs(context.tilesDir);

  const gcsResult = await uploadToGcs({
    bucket: context.config.gcs.bucket,
    sourcePath: paths.renderPath,
    destination: `single/${tile.id}.png`,
    contentType: 'image/png',
    makePublic: true,
    storage: context.storage,
  });

  const editResult = await requestOxenEdit(
    {
      model: context.config.oxen.model,
      input_image: gcsResult.publicUrl,
      prompt: PROMPT_TEMPLATE,
      num_inference_steps: context.config.oxen.numInferenceSteps,
    },
    { fetcher: context.fetcher }
  );

  await downloadImage(editResult.outputUrl, paths.outputPath, { fetcher: context.fetcher });

  return { generated: true };
}

async function generateQuadrant(
  plan: QuadrantPlan,
  context: GenerationContext,
  allTiles: Tile[],
  options: { allowInvalidTemplate?: boolean }
): Promise<{ generatedTiles: number }>{
  const tiles = collectQuadrantTiles(plan);
  if (tiles.length === 0) {
    return { generatedTiles: 0 };
  }

  const positionsToGenerate: Array<{ position: QuadrantPosition; tile: Tile }> = [];
  const infillTiles: Array<{ position: QuadrantPosition; tile: TileImageSource | null }> = [];

  for (const entry of tiles) {
    const position = resolveQuadrantPosition(plan, entry.tile);
    if (!position) {
      continue;
    }

    const paths = resolveTilePaths(entry.tile, context.rendersDir, context.tilesDir);
    const imageSource = toTileImageSource(entry.tile, paths);
    infillTiles.push({ position, tile: imageSource });

    if (entry.tile.status !== 'complete') {
      positionsToGenerate.push({ position, tile: entry.tile });
    }
  }

  if (positionsToGenerate.length === 0) {
    return { generatedTiles: 0 };
  }

  const allImageSources = allTiles.map((tile) => {
    const paths = resolveTilePaths(tile, context.rendersDir, context.tilesDir);
    return toTileImageSource(tile, paths);
  });
  const templateTiles = positionsToGenerate.map(({ tile }) => {
    const paths = resolveTilePaths(tile, context.rendersDir, context.tilesDir);
    return toTileImageSource(tile, paths);
  });

  if (!options.allowInvalidTemplate && !isTemplateValid(plan, templateTiles, allImageSources)) {
    throw new Error(`Quadrant ${plan.record.id} violates template neighbor rules.`);
  }

  const neighborMap = buildNeighborMap(allImageSources);
  const maskEntries = positionsToGenerate.map(({ position, tile }) => ({
    position,
    generate: true,
    neighbors: getNeighborInfo(neighborMap, templateTiles.find((entry) => entry.id === tile.id) ?? null),
  }));

  const infillDir = path.join(context.workDir, 'infill');
  const maskDir = path.join(context.workDir, 'masks');
  const outputDir = path.join(context.workDir, 'quadrants');
  await ensureDirs(infillDir, maskDir, outputDir, context.tilesDir);

  const infillPath = path.join(infillDir, `${plan.record.id}.png`);
  const maskPath = path.join(maskDir, `${plan.record.id}.png`);

  await buildInfillImage({
    tiles: infillTiles,
    tileSize: context.config.tileSize,
    outputPath: infillPath,
    preferOutput: true,
  });

  await buildInfillMask({
    tiles: maskEntries,
    tileSize: context.config.tileSize,
    overlapPixels: context.overlapPixels,
    outputPath: maskPath,
  });

  const gcsResult = await uploadToGcs({
    bucket: context.config.gcs.bucket,
    sourcePath: infillPath,
    destination: `infill/${plan.record.id}.png`,
    contentType: 'image/png',
    makePublic: true,
    storage: context.storage,
  });

  const editResult = await requestOxenEdit(
    {
      model: context.config.oxen.model,
      input_image: gcsResult.publicUrl,
      prompt: PROMPT_TEMPLATE,
      num_inference_steps: context.config.oxen.numInferenceSteps,
    },
    { fetcher: context.fetcher }
  );

  const quadrantOutputPath = path.join(outputDir, `${plan.record.id}.png`);
  await downloadImage(editResult.outputUrl, quadrantOutputPath, { fetcher: context.fetcher });

  const outputs = positionsToGenerate.map(({ position, tile }) => {
    const paths = resolveTilePaths(tile, context.rendersDir, context.tilesDir);
    return { position, outputPath: paths.outputPath };
  });

  await splitQuadrantImage(quadrantOutputPath, context.config.tileSize, outputs);

  return { generatedTiles: outputs.length };
}

export async function runGenerate(options: GenerateOptions = {}): Promise<GenerateSummary> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
  const config = loadConfig(configPath);
  const { rendersDir, tilesDir, workDir } = resolveDirs(options);
  const overlapPixels = options.overlapPixels ?? DEFAULT_OVERLAP_PIXELS;
  const strategy: GenerationStrategy = options.strategy ?? 'spiral';

  const context: GenerationContext = {
    config,
    storage: options.storage,
    fetcher: options.fetcher,
    rendersDir,
    tilesDir,
    workDir,
    overlapPixels,
  };

  const db = openDatabase(dbPath);

  let generatedQuadrants = 0;
  let generatedTiles = 0;
  let skippedQuadrants = 0;
  let failedQuadrants = 0;

  try {
    if (options.tile) {
      const tileId = `tile_${options.tile.x}_${options.tile.y}`;
      const tile = getTile(db, tileId);
      if (!tile) {
        throw new Error(`Tile ${tileId} not found.`);
      }

      updateTile(db, { id: tile.id, status: 'generating', errorMessage: null });

      try {
        await generateSingleTile(tile, context);
        updateTile(db, { id: tile.id, status: 'complete', outputPath: resolveTilePaths(tile, rendersDir, tilesDir).outputPath });
        generatedTiles += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        updateTile(db, { id: tile.id, status: 'failed', errorMessage: message });
        throw error;
      }

      db.close();
      return { generatedQuadrants, generatedTiles, skippedQuadrants, failedQuadrants };
    }

    if (options.quadrant) {
      const quadrantId = `quad_${options.quadrant.qx}_${options.quadrant.qy}`;
      const quadrant = getQuadrant(db, quadrantId);
      if (!quadrant) {
        throw new Error(`Quadrant ${quadrantId} not found.`);
      }

      const tiles = listTiles(db);
      const { byId: tileById } = buildTileMaps(tiles);

      const plan = buildQuadrantPlan(quadrant, tileById);
      if (quadrantAllTilesComplete(plan)) {
        updateQuadrantStatus(db, quadrant.id, 'complete');
        db.close();
        return { generatedQuadrants, generatedTiles, skippedQuadrants, failedQuadrants };
      }

      updateQuadrantStatus(db, quadrant.id, 'generating');
      for (const entry of collectQuadrantTiles(plan)) {
        if (entry.tile.status !== 'complete') {
          updateTile(db, { id: entry.tile.id, status: 'generating', errorMessage: null });
          applyTileUpdate(entry.tile, { status: 'generating' });
        }
      }

      try {
        const result = await generateQuadrant(plan, context, tiles, { allowInvalidTemplate: true });
        generatedTiles += result.generatedTiles;
        generatedQuadrants += 1;

        for (const entry of collectQuadrantTiles(plan)) {
          if (entry.tile.status !== 'complete') {
            const paths = resolveTilePaths(entry.tile, rendersDir, tilesDir);
            updateTile(db, { id: entry.tile.id, status: 'complete', outputPath: paths.outputPath });
            applyTileUpdate(entry.tile, { status: 'complete', outputPath: paths.outputPath });
          }
        }

        const updatedPlan = buildQuadrantPlan(quadrant, tileById);
        updateQuadrantStatus(db, quadrant.id, quadrantAllTilesComplete(updatedPlan) ? 'complete' : 'pending');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        for (const entry of collectQuadrantTiles(plan)) {
          if (entry.tile.status !== 'complete') {
            updateTile(db, { id: entry.tile.id, status: 'failed', errorMessage: message });
            applyTileUpdate(entry.tile, { status: 'failed' });
          }
        }
        updateQuadrantStatus(db, quadrant.id, 'failed');
        throw error;
      }

      db.close();
      return { generatedQuadrants, generatedTiles, skippedQuadrants, failedQuadrants };
    }

    const tiles = listTiles(db);
    const { byId: tileById, byCoord: tileByCoord } = buildTileMaps(tiles);

    const plans = listQuadrants(db)
      .map((record) => buildQuadrantPlan(record, tileById))
      .filter((plan) => quadrantHasIncompleteTiles(plan))
      .filter((plan) => canRetryQuadrant(plan, options));

    const ordered = orderQuadrants(plans, strategy);
    let hasCompleted = hasAnyCompletedTile(tiles);

    let processed = 0;
    for (const plan of ordered) {
      const currentPlan = buildQuadrantPlan(plan.record, tileById);

      if (options.limit !== undefined && processed >= options.limit) {
        break;
      }

      if (!hasCompleted && !quadrantHasIncompleteTiles(plan)) {
        continue;
      }

      if (hasCompleted && !isQuadrantEligible(currentPlan, tileByCoord)) {
        skippedQuadrants += 1;
        continue;
      }

      updateQuadrantStatus(db, currentPlan.record.id, 'generating');
      for (const entry of collectQuadrantTiles(currentPlan)) {
        if (entry.tile.status !== 'complete') {
          updateTile(db, { id: entry.tile.id, status: 'generating', errorMessage: null });
          applyTileUpdate(entry.tile, { status: 'generating' });
        }
      }

      try {
        const result = await generateQuadrant(currentPlan, context, tiles, { allowInvalidTemplate: false });
        generatedTiles += result.generatedTiles;
        generatedQuadrants += 1;
        processed += 1;

        for (const entry of collectQuadrantTiles(currentPlan)) {
          if (entry.tile.status !== 'complete') {
            const paths = resolveTilePaths(entry.tile, rendersDir, tilesDir);
            updateTile(db, { id: entry.tile.id, status: 'complete', outputPath: paths.outputPath });
            applyTileUpdate(entry.tile, { status: 'complete', outputPath: paths.outputPath });
            hasCompleted = true;
          }
        }

        const updatedPlan = buildQuadrantPlan(currentPlan.record, tileById);
        updateQuadrantStatus(
          db,
          currentPlan.record.id,
          quadrantAllTilesComplete(updatedPlan) ? 'complete' : 'pending'
        );
      } catch (error) {
        failedQuadrants += 1;
        const message = error instanceof Error ? error.message : String(error);
        for (const entry of collectQuadrantTiles(currentPlan)) {
          if (entry.tile.status !== 'complete') {
            updateTile(db, { id: entry.tile.id, status: 'failed', errorMessage: message });
            applyTileUpdate(entry.tile, { status: 'failed' });
          }
        }
        updateQuadrantStatus(db, currentPlan.record.id, 'failed');
      }
    }
  } finally {
    db.close();
  }

  return { generatedQuadrants, generatedTiles, skippedQuadrants, failedQuadrants };
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

export function parseQuadrantOption(value?: string): { qx: number; qy: number } | null {
  if (!value) {
    return null;
  }
  const parts = value.split(',').map((entry) => entry.trim());
  if (parts.length !== 2) {
    throw new Error('Quadrant option must be in the format qx,qy.');
  }
  const [qx, qy] = parts.map((entry) => Number(entry));
  if (Number.isNaN(qx) || Number.isNaN(qy)) {
    throw new Error('Quadrant option must contain numbers.');
  }
  return { qx, qy };
}

export function parseStrategy(value?: string): GenerationStrategy {
  if (!value) {
    return 'spiral';
  }
  if (value === 'spiral' || value === 'random' || value === 'row-by-row') {
    return value;
  }
  throw new Error('Strategy must be one of spiral, random, row-by-row.');
}
