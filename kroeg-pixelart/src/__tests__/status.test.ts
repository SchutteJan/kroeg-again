import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { initDatabase, insertTiles, openDatabase } from '../db.js';
import { runStatus } from '../commands/status.js';

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

describeSqlite('status command', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('summarizes tile progress', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroeg-status-'));
    tempDirs.push(tempDir);

    const dbPath = path.join(tempDir, 'amsterdam.db');
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
      },
      {
        id: 'tile_0_1',
        x: 0,
        y: 1,
        north: 0,
        south: -1,
        east: 1,
        west: 0,
        centerLat: -0.5,
        centerLon: 0.5,
        status: 'rendered',
      },
      {
        id: 'tile_1_0',
        x: 1,
        y: 0,
        north: 1,
        south: 0,
        east: 2,
        west: 1,
        centerLat: 0.5,
        centerLon: 1.5,
        status: 'complete',
      },
    ]);
    db.close();

    const result = runStatus({ dbPath });

    expect(result.stats.total).toBe(3);
    expect(result.stats.complete).toBe(1);
    expect(result.stats.rendered).toBe(1);
    expect(result.stats.pending).toBe(1);
    expect(result.lines[0]).toBe('Total tiles: 3');
    expect(result.lines.some((line) => line.startsWith('Complete: 1'))).toBe(true);
  });
});
