import { openDatabase, getTile } from '../db.js';
import { runGenerate, type GenerateOptions, type GenerateSummary, type GenerationStrategy } from '../generate.js';

export type GenerationStatus = 'idle' | 'running' | 'stopping';

export interface GenerationState {
  status: GenerationStatus;
  lastError: string | null;
  lastRunAt: string | null;
}

export interface GenerationControllerOptions {
  dbPath: string;
  configPath?: string;
  rendersDir?: string;
  tilesDir?: string;
  workDir?: string;
  strategy?: GenerationStrategy;
  runner?: (options: GenerateOptions) => Promise<GenerateSummary>;
}

export interface GenerationController {
  getState: () => GenerationState;
  start: (options?: { strategy?: GenerationStrategy }) => GenerationState;
  pause: () => GenerationState;
  retryTile: (tileId: string) => Promise<GenerationState>;
  generateTile: (tileId: string) => Promise<GenerationState>;
  isBusy: () => boolean;
}

const DEFAULT_STATE: GenerationState = {
  status: 'idle',
  lastError: null,
  lastRunAt: null,
};

function parseTileId(tileId: string): { x: number; y: number } | null {
  const match = /^tile_(\d+)_(-?\d+)$/.exec(tileId);
  if (!match) {
    return null;
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

export function createGenerationController(options: GenerationControllerOptions): GenerationController {
  const runner = options.runner ?? runGenerate;
  const state: GenerationState = { ...DEFAULT_STATE };
  let stopRequested = false;
  let loopPromise: Promise<void> | null = null;

  const baseOptions: Pick<GenerateOptions, 'dbPath' | 'configPath' | 'rendersDir' | 'tilesDir' | 'workDir'> = {
    dbPath: options.dbPath,
    configPath: options.configPath,
    rendersDir: options.rendersDir,
    tilesDir: options.tilesDir,
    workDir: options.workDir,
  };

  async function runLoop(strategy?: GenerationStrategy): Promise<void> {
    try {
      while (!stopRequested) {
        const summary = await runner({
          ...baseOptions,
          continue: true,
          limit: 1,
          strategy: strategy ?? options.strategy,
        });

        state.lastRunAt = new Date().toISOString();

        const didWork =
          summary.generatedQuadrants > 0 ||
          summary.generatedTiles > 0 ||
          summary.failedQuadrants > 0;

        if (!didWork) {
          break;
        }
      }
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
    } finally {
      stopRequested = false;
      state.status = 'idle';
    }
  }

  function start(optionsOverride?: { strategy?: GenerationStrategy }): GenerationState {
    if (state.status === 'running') {
      return { ...state };
    }

    stopRequested = false;
    state.status = 'running';
    loopPromise = runLoop(optionsOverride?.strategy);
    void loopPromise;

    return { ...state };
  }

  function pause(): GenerationState {
    if (state.status !== 'running') {
      return { ...state };
    }

    stopRequested = true;
    state.status = 'stopping';
    return { ...state };
  }

  async function retryTile(tileId: string): Promise<GenerationState> {
    if (state.status !== 'idle') {
      return { ...state };
    }

    const coords = parseTileId(tileId);
    if (!coords) {
      throw new Error('Tile id must be in the format tile_x_y.');
    }

    const db = openDatabase(options.dbPath);
    try {
      const tile = getTile(db, tileId);
      if (!tile) {
        throw new Error('Tile not found.');
      }
      if (tile.status !== 'failed') {
        throw new Error('Tile is not marked as failed.');
      }
    } finally {
      db.close();
    }

    state.status = 'running';
    state.lastError = null;
    try {
      await runner({
        ...baseOptions,
        tile: coords,
      });
      state.lastRunAt = new Date().toISOString();
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      state.status = 'idle';
    }

    return { ...state };
  }

  async function generateTile(tileId: string): Promise<GenerationState> {
    if (state.status !== 'idle') {
      return { ...state };
    }

    const coords = parseTileId(tileId);
    if (!coords) {
      throw new Error('Tile id must be in the format tile_x_y.');
    }

    const db = openDatabase(options.dbPath);
    try {
      const tile = getTile(db, tileId);
      if (!tile) {
        throw new Error('Tile not found.');
      }
      if (tile.status !== 'rendered' && tile.status !== 'complete' && tile.status !== 'failed') {
        throw new Error('Tile must be rendered before generating.');
      }
    } finally {
      db.close();
    }

    state.status = 'running';
    state.lastError = null;
    try {
      await runner({
        ...baseOptions,
        tile: coords,
      });
      state.lastRunAt = new Date().toISOString();
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      state.status = 'idle';
    }

    return { ...state };
  }

  function getState(): GenerationState {
    return { ...state };
  }

  function isBusy(): boolean {
    return state.status !== 'idle';
  }

  return {
    getState,
    start,
    pause,
    retryTile,
    generateTile,
    isBusy,
  };
}
