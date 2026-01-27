import fs from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { loadConfig } from './config.js';
import { DEFAULT_DB_PATH, initDatabase, listTiles } from './db.js';
import type { Tile } from './types.js';

export interface AssembleOptions {
  dbPath?: string;
  tilesDir?: string;
  outputDir?: string;
  name?: string;
  tileSize?: number;
  format?: 'jpg' | 'png';
  createViewer?: boolean;
}

export interface AssembleResult {
  outputDir: string;
  dziPath: string;
  width: number;
  height: number;
  levels: number;
  tileSize: number;
  tilesX: number;
  tilesY: number;
}

interface LevelDimensions {
  width: number;
  height: number;
}

const DEFAULT_OUTPUT_DIR = 'output';
const DEFAULT_TILES_DIR = 'tiles';
const DEFAULT_NAME = 'amsterdam';

function getTileSize(explicit?: number): number {
  if (explicit) {
    return explicit;
  }

  const config = loadConfig();
  return config.tileSize;
}

function getTilePath(tile: Tile, tilesDir: string): string {
  if (tile.outputPath && fs.existsSync(tile.outputPath)) {
    return tile.outputPath;
  }

  return path.join(tilesDir, `tile_${tile.coord.x}_${tile.coord.y}.png`);
}

function getLevelDimensions(
  fullWidth: number,
  fullHeight: number,
  maxLevel: number
): LevelDimensions[] {
  const levels: LevelDimensions[] = [];

  for (let level = 0; level <= maxLevel; level += 1) {
    const scale = 2 ** (maxLevel - level);
    levels.push({
      width: Math.ceil(fullWidth / scale),
      height: Math.ceil(fullHeight / scale),
    });
  }

  return levels;
}

function getTileOutputPath(
  filesDir: string,
  level: number,
  x: number,
  y: number,
  format: 'jpg' | 'png'
): string {
  return path.join(filesDir, String(level), `${x}_${y}.${format}`);
}

function getOutputPipeline(image: sharp.Sharp, format: 'jpg' | 'png'): sharp.Sharp {
  const flattened = image.flatten({ background: '#ffffff' });
  if (format === 'png') {
    return flattened.png();
  }
  return flattened.jpeg({ quality: 90 });
}

function renderViewerAssets(outputDir: string, name: string): void {
  const viewerDir = path.join(outputDir, 'viewer');
  fs.mkdirSync(viewerDir, { recursive: true });

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Amsterdam Pixel Art Map</title>
    <link rel="stylesheet" href="style.css" />
    <script src="https://cdn.jsdelivr.net/npm/openseadragon/build/openseadragon/openseadragon.min.js" defer></script>
    <script src="app.js" defer></script>
  </head>
  <body>
    <header>
      <h1>Amsterdam Pixel Art Map</h1>
      <p>Zoom and pan to explore the generated tiles.</p>
    </header>
    <main>
      <div id="map-container"></div>
    </main>
  </body>
</html>
`;

  const css = `:root {
  color-scheme: light;
  font-family: "Space Grotesk", "Segoe UI", sans-serif;
  background: #f6f1e8;
  color: #1f2933;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
}

header {
  padding: 24px 28px;
  background: linear-gradient(120deg, #fcd34d, #fb7185);
  color: #1f2933;
}

header h1 {
  margin: 0 0 6px;
  font-size: 24px;
  letter-spacing: 0.02em;
}

header p {
  margin: 0;
  font-size: 14px;
}

main {
  padding: 16px;
}

#map-container {
  width: 100%;
  height: calc(100vh - 120px);
  border-radius: 16px;
  background: #111827;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}
`;

  const js = `window.addEventListener('DOMContentLoaded', () => {
  const viewer = OpenSeadragon({
    id: 'map-container',
    tileSources: '../${name}.dzi',
    prefixUrl:
      'https://cdn.jsdelivr.net/npm/openseadragon/build/openseadragon/images/',
    showNavigator: true,
    navigatorPosition: 'BOTTOM_RIGHT',
    minZoomLevel: 0.5,
    maxZoomLevel: 10,
    defaultZoomLevel: 1,
  });

  window.viewer = viewer;
});
`;

  fs.writeFileSync(path.join(viewerDir, 'index.html'), html);
  fs.writeFileSync(path.join(viewerDir, 'style.css'), css);
  fs.writeFileSync(path.join(viewerDir, 'app.js'), js);
}

function validateTiles(tiles: Tile[]): {
  tilesByCoord: Map<string, Tile>;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (tiles.length === 0) {
    throw new Error('No tiles found in the database.');
  }

  const incomplete = tiles.filter((tile) => tile.status !== 'complete');
  if (incomplete.length > 0) {
    throw new Error(`Tiles not complete: ${incomplete.length}`);
  }

  const xs = tiles.map((tile) => tile.coord.x);
  const ys = tiles.map((tile) => tile.coord.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const expectedCount = (maxX - minX + 1) * (maxY - minY + 1);
  if (expectedCount !== tiles.length) {
    throw new Error(
      `Tile grid incomplete: expected ${expectedCount} tiles but found ${tiles.length}.`
    );
  }

  const tilesByCoord = new Map<string, Tile>();
  for (const tile of tiles) {
    tilesByCoord.set(`${tile.coord.x}_${tile.coord.y}`, tile);
  }

  return { tilesByCoord, minX, minY, maxX, maxY };
}

export async function assembleDZI(options: AssembleOptions = {}): Promise<AssembleResult> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const tilesDir = options.tilesDir ?? DEFAULT_TILES_DIR;
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
  const name = options.name ?? DEFAULT_NAME;
  const tileSize = getTileSize(options.tileSize);
  const format = options.format ?? 'jpg';

  const db = initDatabase(dbPath);
  const tiles = listTiles(db);
  db.close();

  const { tilesByCoord, minX, minY, maxX, maxY } = validateTiles(tiles);

  const tilesX = maxX - minX + 1;
  const tilesY = maxY - minY + 1;
  const fullWidth = tilesX * tileSize;
  const fullHeight = tilesY * tileSize;

  const maxLevel = Math.ceil(Math.log2(Math.max(fullWidth, fullHeight)));
  const levelDimensions = getLevelDimensions(fullWidth, fullHeight, maxLevel);

  const filesDir = path.join(outputDir, `${name}_files`);
  fs.mkdirSync(filesDir, { recursive: true });

  for (let level = 0; level <= maxLevel; level += 1) {
    fs.mkdirSync(path.join(filesDir, String(level)), { recursive: true });
  }

  const maxLevelDir = path.join(filesDir, String(maxLevel));
  for (let y = 0; y < tilesY; y += 1) {
    for (let x = 0; x < tilesX; x += 1) {
      const tile = tilesByCoord.get(`${minX + x}_${minY + y}`);
      if (!tile) {
        throw new Error(`Missing tile at ${minX + x},${minY + y}.`);
      }

      const sourcePath = getTilePath(tile, tilesDir);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Missing tile image at ${sourcePath}.`);
      }

      const outputPath = path.join(maxLevelDir, `${x}_${y}.${format}`);
      await getOutputPipeline(sharp(sourcePath), format).toFile(outputPath);
    }
  }

  for (let level = maxLevel - 1; level >= 0; level -= 1) {
    const nextLevel = level + 1;
    const nextDimensions = levelDimensions[nextLevel];
    const currentDimensions = levelDimensions[level];
    const tilesAcross = Math.ceil(currentDimensions.width / tileSize);
    const tilesDown = Math.ceil(currentDimensions.height / tileSize);

    for (let y = 0; y < tilesDown; y += 1) {
      for (let x = 0; x < tilesAcross; x += 1) {
        const sourceX = x * tileSize * 2;
        const sourceY = y * tileSize * 2;
        const sourceWidth = Math.min(tileSize * 2, nextDimensions.width - sourceX);
        const sourceHeight = Math.min(tileSize * 2, nextDimensions.height - sourceY);

        const composites: sharp.OverlayOptions[] = [];
        const startX = Math.floor(sourceX / tileSize);
        const startY = Math.floor(sourceY / tileSize);
        const endX = Math.floor((sourceX + sourceWidth - 1) / tileSize);
        const endY = Math.floor((sourceY + sourceHeight - 1) / tileSize);

        for (let tileY = startY; tileY <= endY; tileY += 1) {
          for (let tileX = startX; tileX <= endX; tileX += 1) {
            const tilePath = getTileOutputPath(filesDir, nextLevel, tileX, tileY, format);
            if (!fs.existsSync(tilePath)) {
              throw new Error(`Missing tile for level ${nextLevel} at ${tileX},${tileY}.`);
            }

            const tileWidth = Math.min(tileSize, nextDimensions.width - tileX * tileSize);
            const tileHeight = Math.min(tileSize, nextDimensions.height - tileY * tileSize);

            const tileBuffer = await sharp(tilePath)
              .extract({ left: 0, top: 0, width: tileWidth, height: tileHeight })
              .toBuffer();

            composites.push({
              input: tileBuffer,
              left: tileX * tileSize - sourceX,
              top: tileY * tileSize - sourceY,
            });
          }
        }

        const base = sharp({
          create: {
            width: sourceWidth,
            height: sourceHeight,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
          },
        }).composite(composites);

        const targetWidth = Math.min(tileSize, currentDimensions.width - x * tileSize);
        const targetHeight = Math.min(tileSize, currentDimensions.height - y * tileSize);
        const outputPath = getTileOutputPath(filesDir, level, x, y, format);

        await getOutputPipeline(
          base.resize(targetWidth, targetHeight, { fit: 'fill' }),
          format
        ).toFile(outputPath);
      }
    }
  }

  const dziPath = path.join(outputDir, `${name}.dzi`);
  const dziContents = `<?xml version="1.0" encoding="UTF-8"?>
<Image TileSize="${tileSize}" Overlap="0" Format="${format}" xmlns="http://schemas.microsoft.com/deepzoom/2008">
  <Size Width="${fullWidth}" Height="${fullHeight}" />
</Image>
`;

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(dziPath, dziContents);

  if (options.createViewer ?? true) {
    renderViewerAssets(outputDir, name);
  }

  return {
    outputDir,
    dziPath,
    width: fullWidth,
    height: fullHeight,
    levels: maxLevel + 1,
    tileSize,
    tilesX,
    tilesY,
  };
}
