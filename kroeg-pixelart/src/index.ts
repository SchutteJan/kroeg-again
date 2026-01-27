#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program.name('kroeg-pixelart').description('Amsterdam pixel art map pipeline CLI').version('0.1.0');

program
  .command('init')
  .description('Initialize database and tile grid')
  .option('--force', 'overwrite existing database')
  .option('--bounds <north,south,east,west>', 'override bounds')
  .action(() => {
    console.log('init: not implemented yet');
  });

program
  .command('render')
  .description('Render geometry tiles')
  .option('--tile <x,y>', 'render a single tile')
  .option('--all', 'render all pending tiles')
  .action(() => {
    console.log('render: not implemented yet');
  });

program
  .command('generate')
  .description('Generate pixel art tiles')
  .option('--tile <x,y>', 'generate a single tile')
  .option('--quadrant <qx,qy>', 'generate a quadrant')
  .option('--continue', 'resume generation')
  .option('--limit <count>', 'limit number of quadrants', (value) => Number(value))
  .action(() => {
    console.log('generate: not implemented yet');
  });

program
  .command('assemble')
  .description('Assemble tiles into Deep Zoom Image')
  .action(() => {
    console.log('assemble: not implemented yet');
  });

program
  .command('serve')
  .description('Serve the viewer locally')
  .option('--port <port>', 'port to listen on', (value) => Number(value))
  .action(() => {
    console.log('serve: not implemented yet');
  });

program
  .command('status')
  .description('Show generation status')
  .action(() => {
    console.log('status: not implemented yet');
  });

program
  .command('dashboard')
  .description('Start the generation dashboard')
  .action(() => {
    console.log('dashboard: not implemented yet');
  });

program.parse();
