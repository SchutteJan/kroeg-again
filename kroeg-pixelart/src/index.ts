#!/usr/bin/env node

import 'dotenv/config';

import { Command } from 'commander';

import { runAssemble } from './commands/assemble.js';
import { runBackup } from './commands/backup.js';
import { runDashboard } from './commands/dashboard.js';
import { runGenerateCommand } from './commands/generate.js';
import { runInit } from './commands/init.js';
import { runRenderCommand } from './commands/render.js';
import { runRestore } from './commands/restore.js';
import { runServe } from './commands/serve.js';
import { runStatus } from './commands/status.js';
import { createLogger, toErrorContext } from './logging.js';
import { registerGracefulShutdown } from './shutdown.js';

const program = new Command();
const baseLogger = createLogger({ scope: 'cli' });

const commandLogger = (command: string) => baseLogger.child({ command });

program.name('kroeg-pixelart').description('Amsterdam pixel art map pipeline CLI').version('0.1.0');

program
  .command('init')
  .description('Initialize database and tile grid')
  .option('--force', 'overwrite existing database')
  .option('--bounds <north,south,east,west>', 'override bounds')
  .action((options: { force?: boolean; bounds?: string }) => {
    const logger = commandLogger('init');
    try {
      const result = runInit({ force: options.force, bounds: options.bounds });
      logger.info('init.completed', {
        dbPath: result.dbPath,
        tiles: result.tiles,
        quadrants: result.quadrants,
      });
    } catch (error) {
      logger.error('init.failed', toErrorContext(error));
      process.exitCode = 1;
    }
  });

program
  .command('render')
  .description('Render geometry tiles')
  .option('--tile <x,y>', 'render a single tile')
  .option('--all', 'render all pending tiles')
  .option('--limit <count>', 'limit number of tiles', (value) => Number(value))
  .option('--db <path>', 'path to sqlite database')
  .option('--config <path>', 'path to config json')
  .option('--renders <path>', 'renders directory')
  .action(async (options: { tile?: string; all?: boolean; limit?: number; db?: string; config?: string; renders?: string }) => {
    const logger = commandLogger('render');
    try {
      const result = await runRenderCommand({
        tile: options.tile,
        all: options.all,
        limit: options.limit,
        dbPath: options.db,
        configPath: options.config,
        rendersDir: options.renders,
      });
      logger.info('render.completed', result.counts);
    } catch (error) {
      logger.error('render.failed', toErrorContext(error));
      process.exitCode = 1;
    }
  });

program
  .command('generate')
  .description('Generate pixel art tiles')
  .option('--tile <x,y>', 'generate a single tile')
  .option('--quadrant <qx,qy>', 'generate a quadrant')
  .option('--continue', 'resume generation')
  .option('--limit <count>', 'limit number of quadrants', (value) => Number(value))
  .option('--strategy <strategy>', 'generation strategy (spiral, random, row-by-row)')
  .option('--db <path>', 'path to sqlite database')
  .option('--config <path>', 'path to config json')
  .option('--tiles <path>', 'output tiles directory')
  .option('--renders <path>', 'renders directory')
  .option('--work <path>', 'working directory for infill assets')
  .action(async (options: { tile?: string; quadrant?: string; continue?: boolean; limit?: number; strategy?: string; db?: string; config?: string; tiles?: string; renders?: string; work?: string }) => {
    const logger = commandLogger('generate');
    try {
      const result = await runGenerateCommand({
        tile: options.tile,
        quadrant: options.quadrant,
        continue: options.continue,
        limit: options.limit,
        strategy: options.strategy,
        dbPath: options.db,
        configPath: options.config,
        tilesDir: options.tiles,
        rendersDir: options.renders,
        workDir: options.work,
      });
      logger.info('generate.completed', result.counts);
    } catch (error) {
      logger.error('generate.failed', toErrorContext(error));
      process.exitCode = 1;
    }
  });

program
  .command('assemble')
  .description('Assemble tiles into Deep Zoom Image')
  .option('--db <path>', 'path to sqlite database')
  .option('--tiles <path>', 'directory with tile images')
  .option('--output <path>', 'output directory for DZI assets')
  .option('--name <name>', 'DZI output name prefix')
  .option('--tile-size <size>', 'override tile size', (value) => Number(value))
  .option('--format <format>', 'tile output format (jpg|png)')
  .option('--skip-viewer', 'skip writing viewer assets')
  .action(async (options: { db?: string; tiles?: string; output?: string; name?: string; tileSize?: number; format?: 'jpg' | 'png'; skipViewer?: boolean }) => {
    const logger = commandLogger('assemble');
    try {
      const result = await runAssemble({
        dbPath: options.db,
        tilesDir: options.tiles,
        outputDir: options.output,
        name: options.name,
        tileSize: options.tileSize,
        format: options.format,
        skipViewer: options.skipViewer,
      });
      logger.info('assemble.completed', {
        dziPath: result.dziPath,
        levels: result.levels,
        width: result.width,
        height: result.height,
      });
    } catch (error) {
      logger.error('assemble.failed', toErrorContext(error));
      process.exitCode = 1;
    }
  });

program
  .command('serve')
  .description('Serve the viewer locally')
  .option('--port <port>', 'port to listen on', (value) => Number(value))
  .option('--output <path>', 'output directory for viewer assets')
  .action(async (options: { port?: number; output?: string }) => {
    const logger = commandLogger('serve');
    try {
      const handle = await runServe({ port: options.port, outputDir: options.output });
      logger.info('serve.started', { url: handle.url, port: handle.port });
      registerGracefulShutdown(async () => handle.close(), { logger });
    } catch (error) {
      logger.error('serve.failed', toErrorContext(error));
      process.exitCode = 1;
    }
  });

program
  .command('status')
  .description('Show generation status')
  .option('--db <path>', 'path to sqlite database')
  .action((options: { db?: string }) => {
    const logger = commandLogger('status');
    try {
      const result = runStatus({ dbPath: options.db });
      logger.info('status.report', { stats: result.stats });
    } catch (error) {
      logger.error('status.failed', toErrorContext(error));
      process.exitCode = 1;
    }
  });

program
  .command('dashboard')
  .description('Start the generation dashboard')
  .option('--port <port>', 'port to listen on', (value) => Number(value))
  .option('--db <path>', 'path to sqlite database')
  .option('--open', 'open the browser automatically')
  .action(async (options: { port?: number; db?: string; open?: boolean }) => {
    const logger = commandLogger('dashboard');
    try {
      const handle = await runDashboard({
        port: options.port,
        dbPath: options.db,
        openBrowser: options.open,
      });
      logger.info('dashboard.started', { url: handle.url, port: handle.port });
      registerGracefulShutdown(async () => handle.close(), { logger });
    } catch (error) {
      logger.error('dashboard.failed', toErrorContext(error));
      process.exitCode = 1;
    }
  });

program
  .command('backup')
  .description('Backup the sqlite database')
  .requiredOption('--output <path>', 'backup file path')
  .option('--db <path>', 'path to sqlite database')
  .option('--force', 'overwrite existing backup')
  .action(async (options: { output?: string; db?: string; force?: boolean }) => {
    const logger = commandLogger('backup');
    try {
      const result = await runBackup({
        dbPath: options.db,
        outputPath: options.output,
        force: options.force,
      });
      logger.info('backup.completed', result);
    } catch (error) {
      logger.error('backup.failed', toErrorContext(error));
      process.exitCode = 1;
    }
  });

program
  .command('restore')
  .description('Restore the sqlite database from a backup')
  .requiredOption('--input <path>', 'backup file path')
  .option('--db <path>', 'path to sqlite database')
  .option('--force', 'overwrite existing database')
  .action(async (options: { input?: string; db?: string; force?: boolean }) => {
    const logger = commandLogger('restore');
    try {
      const result = await runRestore({
        dbPath: options.db,
        inputPath: options.input,
        force: options.force,
      });
      logger.info('restore.completed', result);
    } catch (error) {
      logger.error('restore.failed', toErrorContext(error));
      process.exitCode = 1;
    }
  });

program.parse();
