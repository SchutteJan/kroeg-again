import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runBackup } from '../commands/backup.js';
import { runRestore } from '../commands/restore.js';
import { getTile, initDatabase, insertTiles, openDatabase } from '../db.js';

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

describeSqlite('database backup and restore', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        await fs.rm(dir, { recursive: true, force: true });
      }
    }
  });

  it('backs up and restores the sqlite database', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kroeg-backup-'));
    tempDirs.push(tempDir);

    const dbPath = path.join(tempDir, 'amsterdam.db');
    const backupPath = path.join(tempDir, 'amsterdam.backup.db');
    const restorePath = path.join(tempDir, 'amsterdam.restore.db');

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

    await runBackup({ dbPath, outputPath: backupPath });
    await runRestore({ dbPath: restorePath, inputPath: backupPath });

    const restoredDb = openDatabase(restorePath);
    const tile = getTile(restoredDb, 'tile_0_0');
    restoredDb.close();

    expect(tile).not.toBeNull();
    expect(tile?.coord.x).toBe(0);
    expect(tile?.coord.y).toBe(0);
  });
});
