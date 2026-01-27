#!/usr/bin/env node

import { Command } from 'commander';

import { runAssemble } from './commands/assemble.js';
import { runDashboard } from './commands/dashboard.js';
import { runGenerateCommand } from './commands/generate.js';
import { runInit } from './commands/init.js';
import { runRenderCommand } from './commands/render.js';
import { runServe } from './commands/serve.js';
import { runStatus } from './commands/status.js';

const program = new Command();

program.name('kroeg-pixelart').description('Amsterdam pixel art map pipeline CLI').version('0.1.0');

program
  .command('init')
  .description('Initialize database and tile grid')
  .option('--force', 'overwrite existing database')
  .option('--bounds <north,south,east,west>', 'override bounds')
  .action((options: { force?: boolean; bounds?: string }) => {
    try {
      const result = runInit({ force: options.force, bounds: options.bounds });
      console.log(`Initialized database at ${result.dbPath}`);
      console.log(`Tiles: ${result.tiles} | Quadrants: ${result.quadrants}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
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
    try {
      const result = await runRenderCommand({
        tile: options.tile,
        all: options.all,
        limit: options.limit,
        dbPath: options.db,
        configPath: options.config,
        rendersDir: options.renders,
      });
      for (const line of result.summary) {
        console.log(line);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
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
      for (const line of result.summary) {
        console.log(line);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
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
      console.log(`DZI written to ${result.dziPath}`);
      console.log(`Levels: ${result.levels} | Size: ${result.width}x${result.height}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
  });

program
  .command('serve')
  .description('Serve the viewer locally')
  .option('--port <port>', 'port to listen on', (value) => Number(value))
  .option('--output <path>', 'output directory for viewer assets')
  .action(async (options: { port?: number; output?: string }) => {
    try {
      await runServe({ port: options.port, outputDir: options.output });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
  });

program
  .command('status')
  .description('Show generation status')
  .option('--db <path>', 'path to sqlite database')
  .action((options: { db?: string }) => {
    try {
      const result = runStatus({ dbPath: options.db });
      for (const line of result.lines) {
        console.log(line);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
  });

program
  .command('dashboard')
  .description('Start the generation dashboard')
  .option('--port <port>', 'port to listen on', (value) => Number(value))
  .option('--db <path>', 'path to sqlite database')
  .option('--no-open', 'do not open the browser automatically')
  .action(async (options: { port?: number; db?: string; open?: boolean }) => {
    try {
      await runDashboard({
        port: options.port,
        dbPath: options.db,
        openBrowser: options.open,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
  });

program.parse();
