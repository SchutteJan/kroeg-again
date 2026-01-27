import { parseTileOption, runRender } from '../render.js';

export interface RenderCommandOptions {
  tile?: string;
  all?: boolean;
  limit?: number;
  dbPath?: string;
  configPath?: string;
  rendersDir?: string;
}

export async function runRenderCommand(
  options: RenderCommandOptions = {}
): Promise<{ summary: string[]; counts: { renderedTiles: number; skippedTiles: number; failedTiles: number } }> {
  const tile = parseTileOption(options.tile);

  if (!tile && !options.all) {
    throw new Error('Provide either --tile or --all.');
  }
  if (tile && options.all) {
    throw new Error('Provide either --tile or --all, not both.');
  }

  const result = await runRender({
    tile: tile ?? undefined,
    all: options.all,
    limit: options.limit,
    dbPath: options.dbPath,
    configPath: options.configPath,
    rendersDir: options.rendersDir,
  });

  const lines = [
    `Tiles rendered: ${result.renderedTiles}`,
    `Tiles skipped: ${result.skippedTiles}`,
    `Tiles failed: ${result.failedTiles}`,
  ];

  return { summary: lines, counts: result };
}
