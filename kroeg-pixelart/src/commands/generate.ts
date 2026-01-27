import { runGenerate, parseQuadrantOption, parseStrategy, parseTileOption } from '../generate.js';

export interface GenerateCommandOptions {
  tile?: string;
  quadrant?: string;
  limit?: number;
  continue?: boolean;
  strategy?: string;
  dbPath?: string;
  configPath?: string;
  tilesDir?: string;
  rendersDir?: string;
  workDir?: string;
}

export async function runGenerateCommand(
  options: GenerateCommandOptions = {}
): Promise<{
  summary: string[];
  counts: {
    generatedQuadrants: number;
    generatedTiles: number;
    skippedQuadrants: number;
    failedQuadrants: number;
  };
}> {
  const tile = parseTileOption(options.tile);
  const quadrant = parseQuadrantOption(options.quadrant);

  if (tile && quadrant) {
    throw new Error('Provide either --tile or --quadrant, not both.');
  }

  const strategy = parseStrategy(options.strategy);

  const result = await runGenerate({
    dbPath: options.dbPath,
    configPath: options.configPath,
    tilesDir: options.tilesDir,
    rendersDir: options.rendersDir,
    workDir: options.workDir,
    tile: tile ?? undefined,
    quadrant: quadrant ?? undefined,
    limit: options.limit,
    continue: options.continue,
    strategy,
  });

  const lines = [
    `Quadrants generated: ${result.generatedQuadrants}`,
    `Tiles generated: ${result.generatedTiles}`,
    `Quadrants skipped: ${result.skippedQuadrants}`,
    `Quadrants failed: ${result.failedQuadrants}`,
  ];

  return { summary: lines, counts: result };
}
