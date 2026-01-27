import { EventEmitter } from 'node:events';

import type { Database as DatabaseType } from 'better-sqlite3';

import { getProgressCounts } from '../db.js';
import type { ProgressStats, TileStatus, TileUpdate } from '../types.js';

const DEFAULT_POLL_INTERVAL_MS = 1000;

interface TileUpdateRow {
  id: string;
  status: TileStatus;
  error_message: string | null;
  updated_epoch: string;
}

export interface TileUpdateEmitter {
  start(): void;
  stop(): void;
  on(event: 'update', listener: (update: TileUpdate) => void): TileUpdateEmitter;
  off(event: 'update', listener: (update: TileUpdate) => void): TileUpdateEmitter;
  getProgressStats(): ProgressStats;
}

interface TileUpdateEmitterOptions {
  pollIntervalMs?: number;
}

function buildProgressStats(
  counts: Record<TileStatus, number>,
  ratePerHour: number
): ProgressStats {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const remaining = total - counts.complete;
  const safeRate = Math.max(ratePerHour, 0);
  const etaMinutes = safeRate > 0 ? Math.ceil((remaining / safeRate) * 60) : null;

  return {
    total,
    pending: counts.pending,
    rendered: counts.rendered,
    generating: counts.generating,
    complete: counts.complete,
    failed: counts.failed,
    ratePerHour: Number.isFinite(safeRate) ? safeRate : 0,
    etaMinutes,
  };
}

function countsChanged(
  a: Record<TileStatus, number>,
  b: Record<TileStatus, number>
): boolean {
  return (
    a.pending !== b.pending ||
    a.rendered !== b.rendered ||
    a.generating !== b.generating ||
    a.complete !== b.complete ||
    a.failed !== b.failed
  );
}

export function createTileUpdateEmitter(
  db: DatabaseType,
  options: TileUpdateEmitterOptions = {}
): TileUpdateEmitter {
  const emitter = new EventEmitter();
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  let intervalId: NodeJS.Timeout | null = null;
  let lastEpoch = Math.floor(Date.now() / 1000);
  let lastCounts = getProgressCounts(db);
  let lastSampleTime = Date.now();
  let currentProgress = buildProgressStats(lastCounts, 0);
  let hasSentProgress = false;

  const poll = () => {
    const now = Date.now();
    const counts = getProgressCounts(db);
    const elapsedMs = now - lastSampleTime;
    const completeDelta = counts.complete - lastCounts.complete;
    const ratePerHour =
      elapsedMs > 0 ? completeDelta / (elapsedMs / (60 * 60 * 1000)) : 0;

    currentProgress = buildProgressStats(counts, ratePerHour);

    if (!hasSentProgress || countsChanged(counts, lastCounts)) {
      const update: TileUpdate = {
        type: 'progress',
        progress: currentProgress,
        timestamp: new Date(now).toISOString(),
      };
      emitter.emit('update', update);
      hasSentProgress = true;
    }

    lastCounts = counts;
    lastSampleTime = now;

    const rows = db
      .prepare(
        `
        SELECT
          id,
          status,
          error_message,
          strftime('%s', updated_at) as updated_epoch
        FROM tiles
        WHERE strftime('%s', updated_at) > ?
        ORDER BY updated_epoch ASC;
      `
      )
      .all(lastEpoch) as TileUpdateRow[];

    for (const row of rows) {
      const update: TileUpdate = {
        type: 'tile_status',
        tileId: row.id,
        status: row.status,
        timestamp: new Date().toISOString(),
      };
      emitter.emit('update', update);

      if (row.status === 'failed' && row.error_message) {
        const errorUpdate: TileUpdate = {
          type: 'error',
          error: {
            tileId: row.id,
            message: row.error_message,
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };
        emitter.emit('update', errorUpdate);
      }
    }

    if (rows.length > 0) {
      const maxEpoch = rows.reduce((max, row) => {
        const value = Number(row.updated_epoch);
        return Number.isFinite(value) && value > max ? value : max;
      }, lastEpoch);
      lastEpoch = maxEpoch;
    }
  };

  return {
    start() {
      if (intervalId) {
        return;
      }
      poll();
      intervalId = setInterval(poll, pollIntervalMs);
    },
    stop() {
      if (!intervalId) {
        return;
      }
      clearInterval(intervalId);
      intervalId = null;
    },
    on(event, listener) {
      emitter.on(event, listener);
      return this;
    },
    off(event, listener) {
      emitter.off(event, listener);
      return this;
    },
    getProgressStats() {
      if (!intervalId) {
        const counts = getProgressCounts(db);
        currentProgress = buildProgressStats(counts, 0);
      }
      return currentProgress;
    },
  };
}
