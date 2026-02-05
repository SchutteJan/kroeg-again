import { describe, expect, it } from 'vitest';

import {
  generateGrid,
  generateQuadrants,
  getTileBounds,
  latToTileY,
  lonToTileX,
  tileXToLon,
  tileYToLat,
} from '../grid.js';
import type { ViewConfig } from '../types.js';

const testViewConfig: ViewConfig = {
  originLat: 0,
  originLon: 0,
  viewHeightMeters: 200,
  cameraElevation: 30,
  cameraAzimuth: 0,
};

describe('slippy tile math', () => {
  it('converts lon/lat to tile coordinates and back', () => {
    const zoom = 0;
    expect(lonToTileX(0, zoom)).toBe(0);
    expect(latToTileY(0, zoom)).toBe(0);

    const bounds = getTileBounds(0, 0, zoom);
    expect(bounds.west).toBe(-180);
    expect(bounds.east).toBe(180);
    expect(bounds.north).toBeCloseTo(85.0511, 3);
    expect(bounds.south).toBeCloseTo(-85.0511, 3);

    expect(tileXToLon(0, zoom)).toBe(-180);
    expect(tileXToLon(1, zoom)).toBe(180);
    expect(tileYToLat(0, zoom)).toBeCloseTo(85.0511, 3);
    expect(tileYToLat(1, zoom)).toBeCloseTo(-85.0511, 3);
  });
});

describe('generateGrid', () => {
  it('returns a single tile at zoom 0', () => {
    const tiles = generateGrid({
      bounds: { north: 10, south: -10, east: 10, west: -10 },
      tileSize: 512,
      zoomLevel: 0,
      viewConfig: testViewConfig,
    });

    expect(tiles).toHaveLength(1);
    expect(tiles[0].id).toBe('tile_0_0');
  });

  it('covers bounds with all intersecting tiles', () => {
    const tiles = generateGrid({
      bounds: { north: 1, south: -1, east: 0.1, west: -0.1 },
      tileSize: 512,
      zoomLevel: 1,
      viewConfig: testViewConfig,
    });

    const ids = tiles.map((tile) => tile.id).sort();
    expect(ids).toEqual(['tile_0_0', 'tile_0_1', 'tile_1_0', 'tile_1_1']);
  });
});

describe('generateQuadrants', () => {
  it('groups tiles into complete quadrants', () => {
    const tiles = generateGrid({
      bounds: { north: 1, south: -1, east: 0.1, west: -0.1 },
      tileSize: 512,
      zoomLevel: 1,
      viewConfig: testViewConfig,
    });

    const quadrants = generateQuadrants(tiles, { includePartial: false });
    expect(quadrants).toHaveLength(1);
    expect(quadrants[0].id).toBe('quad_0_0');
    expect(quadrants[0].tileTl?.id).toBe('tile_0_0');
    expect(quadrants[0].tileTr?.id).toBe('tile_1_0');
    expect(quadrants[0].tileBl?.id).toBe('tile_0_1');
    expect(quadrants[0].tileBr?.id).toBe('tile_1_1');
  });

  it('includes partial quadrants when enabled', () => {
    const tiles = generateGrid({
      bounds: { north: 1, south: -1, east: 0.1, west: -0.1 },
      tileSize: 512,
      zoomLevel: 1,
      viewConfig: testViewConfig,
    });

    const partialTiles = tiles.filter((tile) => tile.id !== 'tile_1_1');
    const quadrants = generateQuadrants(partialTiles, { includePartial: true });

    expect(quadrants).toHaveLength(1);
    expect(quadrants[0].tileBr).toBeNull();
  });
});
