import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { initDatabase, insertTiles, openDatabase } from '../db.js';
import { runRender } from '../render.js';

function hasSqliteBindings(): boolean {
  try {
    const db = openDatabase(':memory:');
    db.close();
    return true;
  } catch {
    return false;
  }
}

function hasGoogleApiKey(): boolean {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}

const describeWithApiKey = hasSqliteBindings() && hasGoogleApiKey() ? describe : describe.skip;

describeWithApiKey('render pipeline', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        await fsPromises.rm(dir, { recursive: true, force: true });
      }
    }
  });

  it('renders a single tile', async () => {
    const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'kroeg-render-'));
    tempDirs.push(tempDir);

    const dbPath = path.join(tempDir, 'amsterdam.db');
    const configPath = path.join(tempDir, 'config.json');
    const rendersDir = path.join(tempDir, 'renders');

    await fsPromises.mkdir(rendersDir, { recursive: true });

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
    insertTiles(db, [
      {
        id: 'tile_0_0',
        x: 0,
        y: 0,
        north: 1,
        south: 0,
        east: 1,
        west: 0,
        centerLat: 0.5,
        centerLon: 0.5,
        status: 'pending',
      },
    ]);
    db.close();

    const result = await runRender({
      dbPath,
      configPath,
      rendersDir,
      tile: { x: 0, y: 0 },
    });

    expect(result.renderedTiles).toBe(1);

    const outputPath = path.join(rendersDir, 'tile_0_0.png');
    expect(fs.existsSync(outputPath)).toBe(true);

    const meta = await sharp(outputPath).metadata();
    expect(meta.width).toBe(4);
    expect(meta.height).toBe(4);
  });
});
