import express from 'express';

import type { Database as DatabaseType } from 'better-sqlite3';

import { getTile, listTiles } from '../db.js';
import type { TileStatus, TileUpdate } from '../types.js';

import type { TileUpdateEmitter } from './events.js';
import type { GenerationController } from './control.js';

const VALID_STATUSES: TileStatus[] = [
  'pending',
  'rendered',
  'generating',
  'complete',
  'failed',
];

function isTileStatus(value: unknown): value is TileStatus {
  return typeof value === 'string' && VALID_STATUSES.includes(value as TileStatus);
}

export function createDashboardRouter(
  db: DatabaseType,
  emitter: TileUpdateEmitter,
  controller: GenerationController
): express.Router {
  const router = express.Router();

  router.get('/tiles', (req, res) => {
    const statusParam = req.query.status;
    let status: TileStatus | undefined;

    if (statusParam !== undefined) {
      if (!isTileStatus(statusParam)) {
        return res.status(400).json({ error: 'Invalid status filter.' });
      }
      status = statusParam;
    }

    const tiles = listTiles(db, status);
    return res.json(tiles);
  });

  router.get('/tiles/:id', (req, res) => {
    const tile = getTile(db, req.params.id);
    if (!tile) {
      return res.status(404).json({ error: 'Tile not found.' });
    }
    return res.json(tile);
  });

  router.get('/progress', (_req, res) => {
    const stats = emitter.getProgressStats();
    return res.json(stats);
  });

  router.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const send = (update: TileUpdate) => {
      res.write(`data: ${JSON.stringify(update)}\n\n`);
    };

    send({
      type: 'progress',
      progress: emitter.getProgressStats(),
      timestamp: new Date().toISOString(),
    });

    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 15000);

    const listener = (update: TileUpdate) => {
      send(update);
    };

    emitter.on('update', listener);

    req.on('close', () => {
      clearInterval(keepAlive);
      emitter.off('update', listener);
      res.end();
    });
  });

  router.get('/generate/status', (_req, res) => {
    return res.json(controller.getState());
  });

  router.post('/generate/start', (req, res) => {
    if (controller.isBusy()) {
      return res.status(409).json({ error: 'Generation is already running.' });
    }
    const strategy = req.body?.strategy;
    if (strategy !== undefined && !['spiral', 'random', 'row-by-row'].includes(strategy)) {
      return res.status(400).json({ error: 'Invalid generation strategy.' });
    }
    const state = controller.start({ strategy });
    return res.json(state);
  });

  router.post('/generate/pause', (_req, res) => {
    if (!controller.isBusy()) {
      return res.status(409).json({ error: 'Generation is not running.' });
    }
    const state = controller.pause();
    return res.json(state);
  });

  router.post('/generate/retry/:id', async (req, res) => {
    if (controller.isBusy()) {
      return res.status(409).json({ error: 'Generation is running.' });
    }
    try {
      const state = await controller.retryTile(req.params.id);
      return res.json(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(400).json({ error: message });
    }
  });

  return router;
}
