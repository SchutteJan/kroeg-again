import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { initDatabase, insertTiles, openDatabase, updateTile } from '../db.js';
import type { DashboardServerHandle } from '../dashboard/server.js';
import { startDashboardServer } from '../dashboard/server.js';

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

async function waitForSseEvent<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  predicate: (value: T) => boolean,
  timeoutMs = 2000
): Promise<T> {
  const decoder = new TextDecoder();
  let buffer = '';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundaryIndex = buffer.indexOf('\n\n');
    while (boundaryIndex >= 0) {
      const chunk = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) {
          continue;
        }
        const payload = line.replace(/^data:\s*/, '');
        const parsed = JSON.parse(payload) as T;
        if (predicate(parsed)) {
          return parsed;
        }
      }

      boundaryIndex = buffer.indexOf('\n\n');
    }
  }

  throw new Error('Timed out waiting for SSE event');
}

describeSqlite('dashboard API', () => {
  const tempDirs: string[] = [];
  let server: DashboardServerHandle | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }

    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function setupDatabase(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroeg-dashboard-'));
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
        status: 'complete',
      },
    ]);

    db.close();

    return dbPath;
  }

  it('serves tiles and progress endpoints', async () => {
    const dbPath = setupDatabase();

    server = await startDashboardServer({
      dbPath,
      port: 0,
      pollIntervalMs: 50,
    });

    const baseUrl = `http://localhost:${server.port}`;

    const tilesResponse = await fetch(`${baseUrl}/api/tiles`);
    expect(tilesResponse.ok).toBe(true);
    const tiles = (await tilesResponse.json()) as Array<{ id: string }>;
    expect(tiles).toHaveLength(2);

    const filteredResponse = await fetch(`${baseUrl}/api/tiles?status=complete`);
    const filteredTiles = (await filteredResponse.json()) as Array<{ id: string }>;
    expect(filteredTiles).toHaveLength(1);
    expect(filteredTiles[0]?.id).toBe('tile_0_1');

    const tileResponse = await fetch(`${baseUrl}/api/tiles/tile_0_0`);
    expect(tileResponse.ok).toBe(true);
    const tile = (await tileResponse.json()) as { id: string };
    expect(tile.id).toBe('tile_0_0');

    const progressResponse = await fetch(`${baseUrl}/api/progress`);
    const progress = (await progressResponse.json()) as {
      total: number;
      complete: number;
    };
    expect(progress.total).toBe(2);
    expect(progress.complete).toBe(1);

    const statusResponse = await fetch(`${baseUrl}/api/generate/status`);
    expect(statusResponse.ok).toBe(true);
    const status = (await statusResponse.json()) as { status: string };
    expect(status.status).toBe('idle');
  });

  it('streams tile updates over SSE', async () => {
    const dbPath = setupDatabase();

    server = await startDashboardServer({
      dbPath,
      port: 0,
      pollIntervalMs: 50,
    });

    const baseUrl = `http://localhost:${server.port}`;
    const response = await fetch(`${baseUrl}/api/events`);
    expect(response.ok).toBe(true);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Missing response stream');
    }

    const waitForTileUpdate = waitForSseEvent<{ type: string; tileId?: string }>(
      reader,
      (event) => event.type === 'tile_status' && event.tileId === 'tile_0_0'
    );

    const db = openDatabase(dbPath);
    updateTile(db, { id: 'tile_0_0', status: 'complete' });
    db.close();

    const update = await waitForTileUpdate;
    expect(update.tileId).toBe('tile_0_0');

    await reader.cancel();
  });
});
