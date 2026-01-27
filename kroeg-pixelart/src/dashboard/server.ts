import path from 'node:path';

import express from 'express';
import type { Server } from 'node:http';

import { DEFAULT_DB_PATH, openDatabase } from '../db.js';

import { createGenerationController, type GenerationController } from './control.js';
import { createTileUpdateEmitter } from './events.js';
import { createDashboardRouter } from './routes.js';

export interface DashboardServerOptions {
  dbPath?: string;
  port?: number;
  staticDir?: string;
  pollIntervalMs?: number;
  configPath?: string;
  rendersDir?: string;
  tilesDir?: string;
  workDir?: string;
  strategy?: 'spiral' | 'random' | 'row-by-row';
}

export interface DashboardServerHandle {
  app: express.Express;
  server: Server;
  port: number;
  controller: GenerationController;
  close: () => Promise<void>;
}

export async function startDashboardServer(
  options: DashboardServerOptions = {}
): Promise<DashboardServerHandle> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const port = options.port ?? 3001;
  const staticDir = options.staticDir ?? path.resolve(process.cwd(), 'dashboard');

  const db = openDatabase(dbPath);
  const emitter = createTileUpdateEmitter(db, { pollIntervalMs: options.pollIntervalMs });
  emitter.start();

  const controller = createGenerationController({
    dbPath,
    configPath: options.configPath,
    rendersDir: options.rendersDir,
    tilesDir: options.tilesDir,
    workDir: options.workDir,
    strategy: options.strategy,
  });

  const app = express();
  app.use(express.json());
  app.use('/api', createDashboardRouter(db, emitter, controller));
  app.use(express.static(staticDir));

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(port, () => resolve(instance));
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  return {
    app,
    server,
    port: actualPort,
    controller,
    close: () =>
      new Promise<void>((resolve, reject) => {
        controller.pause();
        emitter.stop();
        db.close();
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}
