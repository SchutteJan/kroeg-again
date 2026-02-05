import { create } from 'zustand';
import type { Tile, TileStatus, ProgressStats, ErrorInfo, GenerationState } from '../types';

interface TilesSlice {
  tiles: Map<string, Tile>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  selectedId: string | null;
  filters: Record<TileStatus, boolean>;
  setTiles: (tiles: Tile[]) => void;
  updateTile: (id: string, status: TileStatus, updatedAt?: Date) => void;
  addTile: (tile: Tile) => void;
  setSelectedId: (id: string | null) => void;
  setFilter: (status: TileStatus, enabled: boolean) => void;
}

interface ViewSlice {
  zoom: number;
  panX: number;
  panY: number;
  tileSize: number;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  panStart: { x: number; y: number };
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setDragging: (isDragging: boolean, startX?: number, startY?: number) => void;
  centerView: (canvasWidth: number, canvasHeight: number) => void;
}

interface GenerationSlice {
  status: GenerationState;
  progress: ProgressStats;
  errors: ErrorInfo[];
  lastUpdate: Date | null;
  setStatus: (status: GenerationState) => void;
  setProgress: (progress: ProgressStats) => void;
  addError: (error: ErrorInfo) => void;
  setLastUpdate: (date: Date) => void;
}

interface AppStore extends TilesSlice, ViewSlice, GenerationSlice {}

function updateBounds(tiles: Map<string, Tile>) {
  const tileArray = Array.from(tiles.values());
  if (tileArray.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  return {
    minX: Math.min(...tileArray.map((t) => t.coord.x)),
    maxX: Math.max(...tileArray.map((t) => t.coord.x)),
    minY: Math.min(...tileArray.map((t) => t.coord.y)),
    maxY: Math.max(...tileArray.map((t) => t.coord.y)),
  };
}

export const useStore = create<AppStore>((set, get) => ({
  // Tiles slice
  tiles: new Map(),
  bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
  selectedId: null,
  filters: {
    pending: true,
    rendered: true,
    generating: true,
    complete: true,
    failed: true,
  },
  setTiles: (tiles) => {
    const map = new Map<string, Tile>();
    for (const tile of tiles) {
      map.set(tile.id, {
        ...tile,
        createdAt: new Date(tile.createdAt),
        updatedAt: new Date(tile.updatedAt),
      });
    }
    set({ tiles: map, bounds: updateBounds(map) });
  },
  updateTile: (id, status, updatedAt) => {
    const { tiles } = get();
    const tile = tiles.get(id);
    if (tile) {
      const updated = new Map(tiles);
      updated.set(id, {
        ...tile,
        status,
        updatedAt: updatedAt ?? new Date(),
      });
      set({ tiles: updated });
    }
  },
  addTile: (tile) => {
    const { tiles } = get();
    const updated = new Map(tiles);
    updated.set(tile.id, {
      ...tile,
      createdAt: new Date(tile.createdAt),
      updatedAt: new Date(tile.updatedAt),
    });
    set({ tiles: updated, bounds: updateBounds(updated) });
  },
  setSelectedId: (id) => set({ selectedId: id }),
  setFilter: (status, enabled) =>
    set((state) => ({
      filters: { ...state.filters, [status]: enabled },
    })),

  // View slice
  zoom: 1,
  panX: 0,
  panY: 0,
  tileSize: 14,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  panStart: { x: 0, y: 0 },
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.1), 50) }),
  setPan: (panX, panY) => set({ panX, panY }),
  setDragging: (isDragging, startX, startY) => {
    if (isDragging && startX !== undefined && startY !== undefined) {
      const { panX, panY } = get();
      set({
        isDragging,
        dragStart: { x: startX, y: startY },
        panStart: { x: panX, y: panY },
      });
    } else {
      set({ isDragging });
    }
  },
  centerView: (canvasWidth, canvasHeight) => {
    const { bounds, tileSize, zoom } = get();
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    const gridWidth = width * tileSize * zoom;
    const gridHeight = height * tileSize * zoom;
    set({
      panX: (canvasWidth - gridWidth) / 2,
      panY: (canvasHeight - gridHeight) / 2,
    });
  },

  // Generation slice
  status: { status: 'idle', lastError: null, lastRunAt: null },
  progress: {
    total: 0,
    pending: 0,
    rendered: 0,
    generating: 0,
    complete: 0,
    failed: 0,
    ratePerHour: 0,
    etaMinutes: null,
  },
  errors: [],
  lastUpdate: null,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  addError: (error) =>
    set((state) => ({
      errors: [error, ...state.errors].slice(0, 6),
    })),
  setLastUpdate: (date) => set({ lastUpdate: date }),
}));
