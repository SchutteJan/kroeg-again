import { assembleDZI } from '../assemble.js';
import { DEFAULT_DB_PATH } from '../db.js';

export interface AssembleCommandOptions {
  dbPath?: string;
  tilesDir?: string;
  outputDir?: string;
  name?: string;
  tileSize?: number;
  format?: 'jpg' | 'png';
  skipViewer?: boolean;
}

export async function runAssemble(options: AssembleCommandOptions = {}) {
  return assembleDZI({
    dbPath: options.dbPath ?? DEFAULT_DB_PATH,
    tilesDir: options.tilesDir,
    outputDir: options.outputDir,
    name: options.name,
    tileSize: options.tileSize,
    format: options.format,
    createViewer: options.skipViewer ? false : true,
  });
}
