import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '../db.js';
import { runInit } from '../commands/init.js';

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

function writeConfig(configPath: string, zoomLevel = 1): void {
  const config = {
    bounds: {
      north: 52.4,
      south: 52.34,
      east: 4.95,
      west: 4.85,
    },
    tileSize: 512,
    zoomLevel,
    oxen: {
      model: 'test-model',
      numInferenceSteps: 28,
    },
    gcs: {
      bucket: 'test-bucket',
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

describeSqlite('init command', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (!dir) {
        continue;
      }
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates tiles and quadrants with bounds override', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroeg-pixelart-'));
    tempDirs.push(tempDir);

    const configPath = path.join(tempDir, 'config.json');
    const dbPath = path.join(tempDir, 'amsterdam.db');
    writeConfig(configPath, 1);

    const result = runInit({
      configPath,
      dbPath,
      bounds: '1,-1,0.1,-0.1',
    });

    expect(result.tiles).toBe(4);
    expect(result.quadrants).toBe(1);

    const db = openDatabase(dbPath);
    const tileCount = db.prepare('SELECT COUNT(*) as count FROM tiles;').get() as {
      count: number;
    };
    const quadrantCount = db.prepare('SELECT COUNT(*) as count FROM quadrants;').get() as {
      count: number;
    };
    db.close();

    expect(tileCount.count).toBe(4);
    expect(quadrantCount.count).toBe(1);
  });

  it('requires --force to overwrite existing database', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroeg-pixelart-'));
    tempDirs.push(tempDir);

    const configPath = path.join(tempDir, 'config.json');
    const dbPath = path.join(tempDir, 'amsterdam.db');
    writeConfig(configPath, 1);

    runInit({ configPath, dbPath, bounds: '1,-1,0.1,-0.1' });

    expect(() =>
      runInit({ configPath, dbPath, bounds: '1,-1,0.1,-0.1' })
    ).toThrow(/Use --force/);

    const result = runInit({
      configPath,
      dbPath,
      bounds: '1,-1,0.1,-0.1',
      force: true,
    });

    expect(result.tiles).toBe(4);
  });
});
