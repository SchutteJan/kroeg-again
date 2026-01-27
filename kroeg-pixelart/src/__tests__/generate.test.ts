import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { initDatabase, insertQuadrants, insertTiles, openDatabase } from '../db.js';
import type { StorageLike } from '../gcs.js';
import { orderQuadrants, runGenerate } from '../generate.js';

function hasSqliteBindings(): boolean {
  try {
    const db = openDatabase(':memory:');
    db.close();
    return true;
  } catch {
    return false;
  }
}

const describeSqlite = hasSqliteBindings() ? describe : describe.skip;

describeSqlite('generate pipeline', () => {
  const tempDirs: string[] = [];
  const previousApiKey = process.env.OXEN_API_KEY;

  afterEach(async () => {
    process.env.OXEN_API_KEY = previousApiKey;
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        await fsPromises.rm(dir, { recursive: true, force: true });
      }
    }
  });

  it('generates a quadrant and writes tile outputs', async () => {
    const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'kroeg-generate-'));
    tempDirs.push(tempDir);

    const dbPath = path.join(tempDir, 'amsterdam.db');
    const configPath = path.join(tempDir, 'config.json');
    const rendersDir = path.join(tempDir, 'renders');
    const tilesDir = path.join(tempDir, 'tiles');
    const workDir = path.join(tempDir, 'work');

    await fsPromises.mkdir(rendersDir, { recursive: true });
    await fsPromises.mkdir(tilesDir, { recursive: true });

    await fsPromises.writeFile(
      configPath,
      JSON.stringify({
        bounds: { north: 1, south: 0, east: 1, west: 0 },
        tileSize: 4,
        zoomLevel: 1,
        oxen: { model: 'test-model', numInferenceSteps: 1 },
        gcs: { bucket: 'test-bucket' },
      })
    );

    const db = initDatabase(dbPath);

    const tileIds = ['tile_0_0', 'tile_1_0', 'tile_0_1', 'tile_1_1'];
    for (const tileId of tileIds) {
      const renderPath = path.join(rendersDir, `${tileId}.png`);
      await sharp({
        create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } },
      })
        .png()
        .toFile(renderPath);
    }

    insertTiles(
      db,
      tileIds.map((tileId, index) => {
        const x = index % 2;
        const y = index >= 2 ? 1 : 0;
        return {
          id: tileId,
          x,
          y,
          north: 1,
          south: 0,
          east: 1,
          west: 0,
          status: 'rendered',
          renderPath: path.join(rendersDir, `${tileId}.png`),
        };
      })
    );

    insertQuadrants(db, [
      {
        id: 'quad_0_0',
        qx: 0,
        qy: 0,
        tileTl: 'tile_0_0',
        tileTr: 'tile_1_0',
        tileBl: 'tile_0_1',
        tileBr: 'tile_1_1',
      },
    ]);

    db.close();

    process.env.OXEN_API_KEY = 'test-key';

    const outputBuffer = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .png()
      .toBuffer();

    type FetchInput = Parameters<typeof fetch>[0];
    const fetcher = vi.fn(async (url: FetchInput) => {
      const target = url instanceof Request ? url.url : url.toString();
      if (target.includes('/images/edit')) {
        return new Response(JSON.stringify({ output_url: 'https://example.com/out.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (target === 'https://example.com/out.png') {
        return new Response(outputBuffer, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      }
      throw new Error(`Unexpected fetch url: ${target}`);
    });

    const upload = vi.fn().mockResolvedValue(undefined);
    const makePublic = vi.fn().mockResolvedValue(undefined);
    const file = vi.fn().mockReturnValue({ makePublic });
    const bucket = vi.fn().mockReturnValue({ upload, file });
    const storage: StorageLike = { bucket };

    const result = await runGenerate({
      dbPath,
      configPath,
      rendersDir,
      tilesDir,
      workDir,
      quadrant: { qx: 0, qy: 0 },
      storage,
      fetcher,
    });

    expect(result.generatedQuadrants).toBe(1);
    expect(result.generatedTiles).toBe(4);

    for (const tileId of tileIds) {
      const outputPath = path.join(tilesDir, `${tileId}.png`);
      expect(fs.existsSync(outputPath)).toBe(true);
    }
  });

  it('generates a single tile', async () => {
    const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'kroeg-single-'));
    tempDirs.push(tempDir);

    const dbPath = path.join(tempDir, 'amsterdam.db');
    const configPath = path.join(tempDir, 'config.json');
    const rendersDir = path.join(tempDir, 'renders');
    const tilesDir = path.join(tempDir, 'tiles');

    await fsPromises.mkdir(rendersDir, { recursive: true });
    await fsPromises.mkdir(tilesDir, { recursive: true });

    await fsPromises.writeFile(
      configPath,
      JSON.stringify({
        bounds: { north: 1, south: 0, east: 1, west: 0 },
        tileSize: 4,
        zoomLevel: 1,
        oxen: { model: 'test-model', numInferenceSteps: 1 },
        gcs: { bucket: 'test-bucket' },
      })
    );

    const renderPath = path.join(rendersDir, 'tile_0_0.png');
    await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .png()
      .toFile(renderPath);

    const db = initDatabase(dbPath);
    insertTiles(db, [
      {
        id: 'tile_0_0',
        x: 0,
        y: 0,
        north: 1,
        south: 0,
        east: 1,
        west: 0,
        status: 'rendered',
        renderPath,
      },
    ]);
    db.close();

    process.env.OXEN_API_KEY = 'test-key';

    const outputBuffer = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 80, b: 40 } },
    })
      .png()
      .toBuffer();

    type FetchInput = Parameters<typeof fetch>[0];
    const fetcher = vi.fn(async (url: FetchInput) => {
      const target = url instanceof Request ? url.url : url.toString();
      if (target.includes('/images/edit')) {
        return new Response(JSON.stringify({ output_url: 'https://example.com/single.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (target === 'https://example.com/single.png') {
        return new Response(outputBuffer, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      }
      throw new Error(`Unexpected fetch url: ${target}`);
    });

    const upload = vi.fn().mockResolvedValue(undefined);
    const makePublic = vi.fn().mockResolvedValue(undefined);
    const file = vi.fn().mockReturnValue({ makePublic });
    const bucket = vi.fn().mockReturnValue({ upload, file });
    const storage: StorageLike = { bucket };

    const result = await runGenerate({
      dbPath,
      configPath,
      rendersDir,
      tilesDir,
      tile: { x: 0, y: 0 },
      storage,
      fetcher,
    });

    expect(result.generatedTiles).toBe(1);
    expect(fs.existsSync(path.join(tilesDir, 'tile_0_0.png'))).toBe(true);
  });

  it('orders quadrants row-by-row', () => {
    const plans = [
      { record: { id: 'quad_1_1', qx: 1, qy: 1, status: 'pending' as const, tileTl: null, tileTr: null, tileBl: null, tileBr: null, createdAt: new Date(), updatedAt: new Date() }, tileTl: null, tileTr: null, tileBl: null, tileBr: null },
      { record: { id: 'quad_0_1', qx: 0, qy: 1, status: 'pending' as const, tileTl: null, tileTr: null, tileBl: null, tileBr: null, createdAt: new Date(), updatedAt: new Date() }, tileTl: null, tileTr: null, tileBl: null, tileBr: null },
      { record: { id: 'quad_1_0', qx: 1, qy: 0, status: 'pending' as const, tileTl: null, tileTr: null, tileBl: null, tileBr: null, createdAt: new Date(), updatedAt: new Date() }, tileTl: null, tileTr: null, tileBl: null, tileBr: null },
      { record: { id: 'quad_0_0', qx: 0, qy: 0, status: 'pending' as const, tileTl: null, tileTr: null, tileBl: null, tileBr: null, createdAt: new Date(), updatedAt: new Date() }, tileTl: null, tileTr: null, tileBl: null, tileBr: null },
    ];

    const ordered = orderQuadrants(plans, 'row-by-row');

    expect(ordered.map((plan) => plan.record.id)).toEqual([
      'quad_0_0',
      'quad_1_0',
      'quad_0_1',
      'quad_1_1',
    ]);
  });
});
