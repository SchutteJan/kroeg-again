export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TileCoord {
  x: number;
  y: number;
}

export type TileStatus = 'pending' | 'rendered' | 'generating' | 'complete' | 'failed';

export interface Tile {
  id: string;
  coord: TileCoord;
  bounds: GeoBounds;
  status: TileStatus;
  renderPath?: string;
  outputPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressStats {
  total: number;
  pending: number;
  rendered: number;
  generating: number;
  complete: number;
  failed: number;
  ratePerHour: number;
  etaMinutes: number | null;
}

export interface ErrorInfo {
  tileId: string;
  message: string;
  timestamp?: string;
}

export type TileUpdateType = 'tile_status' | 'progress' | 'error';

export interface TileUpdate {
  type: TileUpdateType;
  tileId?: string;
  status?: TileStatus;
  progress?: ProgressStats;
  error?: ErrorInfo;
  timestamp: string;
}

export interface GenerationState {
  status: 'idle' | 'running' | 'stopping';
  lastError: string | null;
  lastRunAt: string | null;
}

export const STATUS_COLORS: Record<TileStatus, string> = {
  pending: '#4b5563',
  rendered: '#24478d',
  generating: '#d27c3e',
  complete: '#1f8a5a',
  failed: '#c13c34',
};

export const STATUS_LABELS: Record<TileStatus, string> = {
  pending: 'Pending',
  rendered: 'Rendered',
  generating: 'Generating',
  complete: 'Complete',
  failed: 'Failed',
};
