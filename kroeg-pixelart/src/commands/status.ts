import { DEFAULT_DB_PATH, getProgressCounts, openDatabase } from '../db.js';
import type { ProgressStats, TileStatus } from '../types.js';

export interface StatusOptions {
  dbPath?: string;
}

export interface StatusResult {
  stats: ProgressStats;
  lines: string[];
}

const STATUS_ORDER: TileStatus[] = [
  'pending',
  'rendered',
  'generating',
  'complete',
  'failed',
];

export function buildProgressStats(
  counts: Record<TileStatus, number>
): ProgressStats {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return {
    total,
    pending: counts.pending,
    rendered: counts.rendered,
    generating: counts.generating,
    complete: counts.complete,
    failed: counts.failed,
    ratePerHour: 0,
    etaMinutes: null,
  };
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return '0%';
  }
  return `${value.toFixed(1)}%`;
}

export function formatStatus(stats: ProgressStats): string[] {
  const percentComplete = stats.total > 0 ? (stats.complete / stats.total) * 100 : 0;
  const eta = stats.etaMinutes !== null ? `${stats.etaMinutes} min` : 'n/a';
  const rate = stats.ratePerHour > 0 ? `${stats.ratePerHour.toFixed(1)} tiles/hour` : 'n/a';

  const lines: string[] = [`Total tiles: ${stats.total}`];
  const counts: Record<TileStatus, number> = {
    pending: stats.pending,
    rendered: stats.rendered,
    generating: stats.generating,
    complete: stats.complete,
    failed: stats.failed,
  };

  for (const status of STATUS_ORDER) {
    if (status === 'complete') {
      lines.push(
        `Complete: ${stats.complete} (${formatPercent(percentComplete)})`
      );
      continue;
    }
    lines.push(`${capitalize(status)}: ${counts[status]}`);
  }

  lines.push(`Rate: ${rate}`);
  lines.push(`ETA: ${eta}`);

  return lines;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function runStatus(options: StatusOptions = {}): StatusResult {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const db = openDatabase(dbPath);
  const counts = getProgressCounts(db);
  db.close();

  const stats = buildProgressStats(counts);
  const lines = formatStatus(stats);

  return { stats, lines };
}
