import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type { Tile, TileStatus } from './types.js';

export type QuadrantPosition = 'tl' | 'tr' | 'bl' | 'br';

export interface TileImageSource {
  id: string;
  coord: Tile['coord'];
  status: TileStatus;
  renderPath?: string | null;
  outputPath?: string | null;
}

export interface QuadrantTileInput {
  position: QuadrantPosition;
  tile: TileImageSource | null;
}

export interface InfillImageOptions {
  tiles: QuadrantTileInput[];
  tileSize: number;
  outputPath: string;
  preferOutput?: boolean;
  allowMissing?: boolean;
}

export interface InfillImageResult {
  outputPath: string;
  width: number;
  height: number;
  sources: Array<{ position: QuadrantPosition; sourcePath: string }>;
}

export interface NeighborInfo {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface InfillMaskTileInput {
  position: QuadrantPosition;
  generate: boolean;
  neighbors: NeighborInfo;
}

export interface InfillMaskOptions {
  tiles: InfillMaskTileInput[];
  tileSize: number;
  overlapPixels: number;
  outputPath: string;
}

export interface InfillMaskResult {
  outputPath: string;
  width: number;
  height: number;
}

export type TemplateShape = '1x1' | '1x2' | '2x1' | '2x2';

export interface TemplateNeighborStatus {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

const POSITION_OFFSETS: Record<QuadrantPosition, { left: number; top: number }> = {
  tl: { left: 0, top: 0 },
  tr: { left: 1, top: 0 },
  bl: { left: 0, top: 1 },
  br: { left: 1, top: 1 },
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveTileImagePath(
  tile: TileImageSource,
  preferOutput: boolean
): string | null {
  const candidates: Array<string | null | undefined> = preferOutput
    ? [tile.outputPath, tile.renderPath]
    : [tile.renderPath, tile.outputPath];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

export async function buildInfillImage(
  options: InfillImageOptions
): Promise<InfillImageResult> {
  const width = options.tileSize * 2;
  const height = options.tileSize * 2;
  const preferOutput = options.preferOutput ?? true;
  const allowMissing = options.allowMissing ?? false;

  const compositeInputs: Array<{ input: string; left: number; top: number }> = [];
  const sources: Array<{ position: QuadrantPosition; sourcePath: string }> = [];

  for (const entry of options.tiles) {
    if (!entry.tile) {
      continue;
    }
    const resolved = resolveTileImagePath(entry.tile, preferOutput);
    if (!resolved) {
      if (!allowMissing) {
        throw new Error(`Tile ${entry.tile.id} missing render/output image.`);
      }
      continue;
    }

    const exists = await fileExists(resolved);
    if (!exists) {
      if (!allowMissing) {
        throw new Error(`Tile image not found at ${resolved}.`);
      }
      continue;
    }

    const offset = POSITION_OFFSETS[entry.position];
    compositeInputs.push({
      input: resolved,
      left: offset.left * options.tileSize,
      top: offset.top * options.tileSize,
    });
    sources.push({ position: entry.position, sourcePath: resolved });
  }

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });

  const base = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  if (compositeInputs.length > 0) {
    base.composite(compositeInputs);
  }

  await base.png().toFile(options.outputPath);

  return { outputPath: options.outputPath, width, height, sources };
}

function clampOverlap(value: number, tileSize: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(value, Math.floor(tileSize / 2));
}

export async function buildInfillMask(
  options: InfillMaskOptions
): Promise<InfillMaskResult> {
  const width = options.tileSize * 2;
  const height = options.tileSize * 2;
  const overlap = clampOverlap(options.overlapPixels, options.tileSize);

  const compositeInputs: Array<{ input: Buffer; left: number; top: number }> = [];

  for (const entry of options.tiles) {
    if (!entry.generate) {
      continue;
    }

    const offset = POSITION_OFFSETS[entry.position];
    const insetLeft = entry.neighbors.left ? overlap : 0;
    const insetRight = entry.neighbors.right ? overlap : 0;
    const insetTop = entry.neighbors.top ? overlap : 0;
    const insetBottom = entry.neighbors.bottom ? overlap : 0;

    const tileWidth = options.tileSize - insetLeft - insetRight;
    const tileHeight = options.tileSize - insetTop - insetBottom;
    if (tileWidth <= 0 || tileHeight <= 0) {
      continue;
    }

    const rect = await sharp({
      create: {
        width: tileWidth,
        height: tileHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    compositeInputs.push({
      input: rect,
      left: offset.left * options.tileSize + insetLeft,
      top: offset.top * options.tileSize + insetTop,
    });
  }

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });

  const base = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  });

  if (compositeInputs.length > 0) {
    base.composite(compositeInputs);
  }

  await base.png().toFile(options.outputPath);

  return { outputPath: options.outputPath, width, height };
}

export function determineTemplateShape(positions: QuadrantPosition[]): TemplateShape {
  const unique = Array.from(new Set(positions));
  if (unique.length === 1) {
    return '1x1';
  }
  if (unique.length === 2) {
    const [first, second] = unique;
    const firstOffset = POSITION_OFFSETS[first];
    const secondOffset = POSITION_OFFSETS[second];
    if (firstOffset.left === secondOffset.left) {
      return '1x2';
    }
    if (firstOffset.top === secondOffset.top) {
      return '2x1';
    }
  }
  if (unique.length === 4) {
    return '2x2';
  }
  throw new Error('Invalid template layout for quadrant generation.');
}

export function getTemplateNeighborStatus(
  allTiles: TileImageSource[],
  templateTiles: TileImageSource[],
  predicate: (tile: TileImageSource) => boolean = (tile) => tile.status === 'complete'
): TemplateNeighborStatus {
  const map = new Map<string, TileImageSource>();
  for (const tile of allTiles) {
    map.set(`${tile.coord.x}_${tile.coord.y}`, tile);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const tile of templateTiles) {
    minX = Math.min(minX, tile.coord.x);
    maxX = Math.max(maxX, tile.coord.x);
    minY = Math.min(minY, tile.coord.y);
    maxY = Math.max(maxY, tile.coord.y);
  }

  const hasNeighbor = (x: number, y: number): boolean => {
    const tile = map.get(`${x}_${y}`);
    return tile ? predicate(tile) : false;
  };

  let left = false;
  let right = false;
  let top = false;
  let bottom = false;

  for (let y = minY; y <= maxY; y += 1) {
    if (hasNeighbor(minX - 1, y)) {
      left = true;
    }
    if (hasNeighbor(maxX + 1, y)) {
      right = true;
    }
  }

  for (let x = minX; x <= maxX; x += 1) {
    if (hasNeighbor(x, minY - 1)) {
      top = true;
    }
    if (hasNeighbor(x, maxY + 1)) {
      bottom = true;
    }
  }

  return { top, right, bottom, left };
}

export function validateTemplateNeighbors(
  shape: TemplateShape,
  neighbors: TemplateNeighborStatus
): boolean {
  const neighborCount = [
    neighbors.top,
    neighbors.right,
    neighbors.bottom,
    neighbors.left,
  ].filter(Boolean).length;

  switch (shape) {
    case '1x1':
      return neighborCount <= 3;
    case '1x2':
      return !(neighbors.left && neighbors.right);
    case '2x1':
      return !(neighbors.top && neighbors.bottom);
    case '2x2':
      return neighborCount === 0;
    default:
      return false;
  }
}

export function buildNeighborMap(
  tiles: TileImageSource[],
  predicate: (tile: TileImageSource) => boolean = (tile) => tile.status === 'complete'
): Map<string, NeighborInfo> {
  const map = new Map<string, TileImageSource>();
  for (const tile of tiles) {
    map.set(`${tile.coord.x}_${tile.coord.y}`, tile);
  }

  const neighbors = new Map<string, NeighborInfo>();
  for (const tile of tiles) {
    const key = `${tile.coord.x}_${tile.coord.y}`;
    const top = map.get(`${tile.coord.x}_${tile.coord.y - 1}`);
    const right = map.get(`${tile.coord.x + 1}_${tile.coord.y}`);
    const bottom = map.get(`${tile.coord.x}_${tile.coord.y + 1}`);
    const left = map.get(`${tile.coord.x - 1}_${tile.coord.y}`);

    neighbors.set(key, {
      top: top ? predicate(top) : false,
      right: right ? predicate(right) : false,
      bottom: bottom ? predicate(bottom) : false,
      left: left ? predicate(left) : false,
    });
  }

  return neighbors;
}

export function getNeighborInfo(
  neighborMap: Map<string, NeighborInfo>,
  tile: TileImageSource | null
): NeighborInfo {
  if (!tile) {
    return { top: false, right: false, bottom: false, left: false };
  }
  return (
    neighborMap.get(`${tile.coord.x}_${tile.coord.y}`) ?? {
      top: false,
      right: false,
      bottom: false,
      left: false,
    }
  );
}
