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

export type QuadrantStatus = 'pending' | 'generating' | 'complete' | 'failed';

export interface Quadrant {
  id: string;
  tiles: [Tile, Tile, Tile, Tile];
  status: QuadrantStatus;
  mask?: string;
}

export interface RenderConfig {
  width: number;
  height: number;
  cameraAngle: number;
  cameraZoom: number;
}

export interface OxenGenerationRequest {
  model: string;
  input_image: string;
  prompt: string;
  num_inference_steps: number;
}

export interface GenerationRequest {
  inputImagePath: string;
  gcsUrl?: string;
  prompt: string;
}

export interface GenerationResult {
  outputUrl: string;
  outputPath: string;
  success: boolean;
  error?: string;
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
  timestamp: string;
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

export interface OxenConfig {
  model: string;
  numInferenceSteps: number;
}

export interface GcsConfig {
  bucket: string;
}

export interface AppConfig {
  bounds: GeoBounds;
  tileSize: number;
  zoomLevel: number;
  oxen: OxenConfig;
  gcs: GcsConfig;
}
