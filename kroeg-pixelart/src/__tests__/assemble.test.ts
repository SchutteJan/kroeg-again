import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { assembleDZI } from '../assemble.js';
import { initDatabase, insertTiles, openDatabase } from '../db.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

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

describeSqlite('assembleDZI', () => {
  it('builds DZI tiles and descriptor from completed tiles', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroeg-assemble-'));
    tempDirs.push(tempDir);

    const tilesDir = path.join(tempDir, 'tiles');
    const outputDir = path.join(tempDir, 'output');
    fs.mkdirSync(tilesDir, { recursive: true });

    const tileSize = 32;
    const tiles: Array<{ x: number; y: number; color: string }> = [
      { x: 0, y: 0, color: '#f87171' },
      { x: 1, y: 0, color: '#60a5fa' },
      { x: 0, y: 1, color: '#34d399' },
      { x: 1, y: 1, color: '#fbbf24' },
    ];

    for (const tile of tiles) {
      const filePath = path.join(tilesDir, `tile_${tile.x}_${tile.y}.png`);
      await sharp({
        create: {
          width: tileSize,
          height: tileSize,
          channels: 3,
          background: tile.color,
        },
      })
        .png()
        .toFile(filePath);
    }

    const dbPath = path.join(tempDir, 'amsterdam.db');
    const db = initDatabase(dbPath);
    insertTiles(
      db,
      tiles.map((tile) => ({
        id: `tile_${tile.x}_${tile.y}`,
        x: tile.x,
        y: tile.y,
        status: 'complete',
        north: 1,
        south: 0,
        east: 1,
        west: 0,
      }))
    );
    db.close();

    const result = await assembleDZI({
      dbPath,
      tilesDir,
      outputDir,
      name: 'testmap',
      tileSize,
      format: 'jpg',
      createViewer: false,
    });

    const dziContents = fs.readFileSync(result.dziPath, 'utf-8');
    expect(dziContents).toContain('TileSize="32"');
    expect(dziContents).toContain('Width="64"');
    expect(dziContents).toContain('Height="64"');

    const maxLevel = result.levels - 1;
    const topTilePath = path.join(outputDir, 'testmap_files', String(maxLevel), '0_0.jpg');
    expect(fs.existsSync(topTilePath)).toBe(true);
  });
});
