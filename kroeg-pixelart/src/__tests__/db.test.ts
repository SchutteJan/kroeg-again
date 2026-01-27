import { describe, expect, it } from 'vitest';

import {
  getProgressCounts,
  getQuadrant,
  getTile,
  initDatabase,
  insertQuadrants,
  insertTiles,
  listQuadrants,
  listTiles,
  updateQuadrantStatus,
  updateTile,
} from '../db.js';

function hasSqliteBindings(): boolean {
  try {
    const db = initDatabase(':memory:');
    db.close();
    return true;
  } catch {
    return false;
  }
}

const describeSqlite = hasSqliteBindings() ? describe : describe.skip;

describeSqlite('db', () => {
  it('initializes schema and stores schema version', () => {
    const db = initDatabase(':memory:');

    const versionRow = db.prepare('SELECT version FROM schema_version LIMIT 1;').get() as {
      version: number;
    };

    expect(versionRow.version).toBe(1);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all() as Array<{
      name: string;
    }>;
    const names = tables.map((table) => table.name);

    expect(names).toContain('tiles');
    expect(names).toContain('quadrants');
    expect(names).toContain('generation_log');

    db.close();
  });

  it('inserts and updates tiles', () => {
    const db = initDatabase(':memory:');

    insertTiles(db, [
      {
        id: 'tile_0_0',
        x: 0,
        y: 0,
        north: 1,
        south: 0,
        east: 1,
        west: 0,
      },
    ]);

    const tile = getTile(db, 'tile_0_0');
    expect(tile?.status).toBe('pending');
    expect(tile?.bounds.north).toBe(1);

    updateTile(db, {
      id: 'tile_0_0',
      status: 'complete',
      outputPath: 'tiles/tile_0_0.png',
    });

    const updated = getTile(db, 'tile_0_0');
    expect(updated?.status).toBe('complete');
    expect(updated?.outputPath).toBe('tiles/tile_0_0.png');

    const allTiles = listTiles(db);
    expect(allTiles).toHaveLength(1);

    const counts = getProgressCounts(db);
    expect(counts.complete).toBe(1);

    db.close();
  });

  it('inserts and updates quadrants', () => {
    const db = initDatabase(':memory:');

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

    const quadrant = getQuadrant(db, 'quad_0_0');
    expect(quadrant?.status).toBe('pending');
    expect(quadrant?.tileTl).toBe('tile_0_0');

    updateQuadrantStatus(db, 'quad_0_0', 'complete');

    const updated = getQuadrant(db, 'quad_0_0');
    expect(updated?.status).toBe('complete');

    const allQuadrants = listQuadrants(db);
    expect(allQuadrants).toHaveLength(1);

    db.close();
  });
});
