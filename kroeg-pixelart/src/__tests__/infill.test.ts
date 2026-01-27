import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildInfillImage,
  buildInfillMask,
  determineTemplateShape,
  validateTemplateNeighbors,
} from '../infill.js';
import type { TileImageSource } from '../infill.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

async function writeSolidPng(
  filePath: string,
  size: number,
  color: { r: number; g: number; b: number; alpha?: number }
): Promise<void> {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toFile(filePath);
}

async function readPixel(
  filePath: string,
  x: number,
  y: number
): Promise<[number, number, number, number]> {
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const idx = (y * info.width + x) * info.channels;
  return [
    data[idx] ?? 0,
    data[idx + 1] ?? 0,
    data[idx + 2] ?? 0,
    data[idx + 3] ?? 0,
  ];
}

describe('buildInfillImage', () => {
  it('composites quadrant tiles and prefers output images when available', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroeg-infill-'));
    tempDirs.push(tempDir);

    const tileSize = 8;
    const outputPath = path.join(tempDir, 'infill.png');
    const outputTile = path.join(tempDir, 'tile_output.png');
    const renderTile = path.join(tempDir, 'tile_render.png');
    const renderTileTr = path.join(tempDir, 'tile_render_tr.png');

    await writeSolidPng(outputTile, tileSize, { r: 255, g: 0, b: 0, alpha: 1 });
    await writeSolidPng(renderTile, tileSize, { r: 0, g: 0, b: 255, alpha: 1 });
    await writeSolidPng(renderTileTr, tileSize, { r: 0, g: 255, b: 0, alpha: 1 });

    const tlTile: TileImageSource = {
      id: 'tile_0_0',
      coord: { x: 0, y: 0 },
      status: 'complete',
      renderPath: renderTile,
      outputPath: outputTile,
    };

    const trTile: TileImageSource = {
      id: 'tile_1_0',
      coord: { x: 1, y: 0 },
      status: 'pending',
      renderPath: renderTileTr,
    };

    await buildInfillImage({
      tiles: [
        { position: 'tl', tile: tlTile },
        { position: 'tr', tile: trTile },
        { position: 'bl', tile: null },
        { position: 'br', tile: null },
      ],
      tileSize,
      outputPath,
    });

    const tlPixel = await readPixel(outputPath, 2, 2);
    expect(tlPixel[0]).toBe(255);
    expect(tlPixel[1]).toBe(0);
    expect(tlPixel[2]).toBe(0);

    const trPixel = await readPixel(outputPath, tileSize + 2, 2);
    expect(trPixel[1]).toBe(255);

    const blPixel = await readPixel(outputPath, 2, tileSize + 2);
    expect(blPixel[3]).toBe(0);
  });
});

describe('buildInfillMask', () => {
  it('insets mask regions based on neighbor overlap', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroeg-mask-'));
    tempDirs.push(tempDir);

    const tileSize = 16;
    const outputPath = path.join(tempDir, 'mask.png');

    await buildInfillMask({
      tileSize,
      overlapPixels: 4,
      outputPath,
      tiles: [
        {
          position: 'tl',
          generate: true,
          neighbors: { top: true, left: true, right: false, bottom: false },
        },
      ],
    });

    const cornerPixel = await readPixel(outputPath, 1, 1);
    expect(cornerPixel[0]).toBe(0);

    const innerPixel = await readPixel(outputPath, 5, 5);
    expect(innerPixel[0]).toBe(255);
  });
});

describe('template validation', () => {
  it('determines template shapes from positions', () => {
    expect(determineTemplateShape(['tl'])).toBe('1x1');
    expect(determineTemplateShape(['tl', 'bl'])).toBe('1x2');
    expect(determineTemplateShape(['tl', 'tr'])).toBe('2x1');
    expect(determineTemplateShape(['tl', 'tr', 'bl', 'br'])).toBe('2x2');
  });

  it('validates template neighbor constraints', () => {
    expect(
      validateTemplateNeighbors('2x2', {
        top: false,
        right: true,
        bottom: false,
        left: false,
      })
    ).toBe(false);

    expect(
      validateTemplateNeighbors('1x2', {
        top: false,
        right: true,
        bottom: false,
        left: true,
      })
    ).toBe(false);

    expect(
      validateTemplateNeighbors('2x1', {
        top: true,
        right: false,
        bottom: true,
        left: false,
      })
    ).toBe(false);

    expect(
      validateTemplateNeighbors('1x1', {
        top: true,
        right: true,
        bottom: true,
        left: true,
      })
    ).toBe(false);

    expect(
      validateTemplateNeighbors('1x1', {
        top: true,
        right: true,
        bottom: true,
        left: false,
      })
    ).toBe(true);
  });
});
