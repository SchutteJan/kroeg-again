import type { GeoBounds, Tile, TileCenter, ViewConfig } from './types.js';

const MAX_LATITUDE = 85.05112878;
const DEG_TO_RAD = Math.PI / 180;
const METERS_PER_DEGREE_LAT = 111111;

function clampLatitude(latitude: number): number {
  return Math.min(MAX_LATITUDE, Math.max(-MAX_LATITUDE, latitude));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function validateBounds(bounds: GeoBounds): void {
  if (bounds.north <= bounds.south) {
    throw new Error('GeoBounds north must be greater than south.');
  }
  if (bounds.east <= bounds.west) {
    throw new Error('GeoBounds east must be greater than west.');
  }
}

function validateZoom(zoomLevel: number): void {
  if (!Number.isInteger(zoomLevel) || zoomLevel < 0) {
    throw new Error('Zoom level must be a non-negative integer.');
  }
}

function validateTileSize(tileSize: number): void {
  if (!Number.isFinite(tileSize) || tileSize <= 0) {
    throw new Error('Tile size must be a positive number.');
  }
}

export function lonToTileX(longitude: number, zoomLevel: number): number {
  validateZoom(zoomLevel);
  const n = 2 ** zoomLevel;
  const x = ((longitude + 180) / 360) * n;
  const clamped = Math.min(n - 1, Math.max(0, Math.floor(x)));
  return clamped;
}

export function latToTileY(latitude: number, zoomLevel: number): number {
  validateZoom(zoomLevel);
  const n = 2 ** zoomLevel;
  const lat = clampLatitude(latitude);
  const latRad = toRadians(lat);
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const clamped = Math.min(n - 1, Math.max(0, Math.floor(y)));
  return clamped;
}

export function tileXToLon(tileX: number, zoomLevel: number): number {
  validateZoom(zoomLevel);
  const n = 2 ** zoomLevel;
  return (tileX / n) * 360 - 180;
}

export function tileYToLat(tileY: number, zoomLevel: number): number {
  validateZoom(zoomLevel);
  const n = 2 ** zoomLevel;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n)));
  return toDegrees(latRad);
}

export function getTileBounds(tileX: number, tileY: number, zoomLevel: number): GeoBounds {
  return {
    north: tileYToLat(tileY, zoomLevel),
    south: tileYToLat(tileY + 1, zoomLevel),
    west: tileXToLon(tileX, zoomLevel),
    east: tileXToLon(tileX + 1, zoomLevel),
  };
}

/**
 * Calculate the lat/lon center for a tile at grid position (tileX, tileY).
 *
 * This uses view-space offsets to ensure tiles align correctly when rendered
 * with an angled orthographic camera. Based on isometric-nyc's calculate_offset.
 *
 * The algorithm:
 * 1. Convert tile grid position to screen-space pixel offset
 * 2. Convert screen pixels to meters in view space
 * 3. Account for camera elevation angle (foreshortening)
 * 4. Rotate by camera azimuth to get east/north offsets
 * 5. Convert meters to lat/lon delta
 */
export function calculateTileCenter(
  tileX: number,
  tileY: number,
  viewConfig: ViewConfig,
  tilePixelSize: number
): TileCenter {
  const { originLat, originLon, viewHeightMeters, cameraElevation, cameraAzimuth } = viewConfig;

  // Step 1: Tile grid position to screen-space pixel offset
  // Tile (0,0) is at origin, tiles increase right (+X) and down (+Y in screen)
  const shiftXPx = tileX * tilePixelSize;
  const shiftYPx = tileY * tilePixelSize;

  // Step 2: Convert pixels to meters in view space
  // viewHeightMeters corresponds to tilePixelSize pixels
  const metersPerPixel = viewHeightMeters / tilePixelSize;
  const shiftRightMeters = shiftXPx * metersPerPixel;
  const shiftUpMeters = -shiftYPx * metersPerPixel; // Screen Y is inverted

  // Step 3: Convert screen movement to world movement (account for elevation)
  // When looking down at an angle, vertical screen movement maps to larger ground distance
  const elevRad = Math.abs(cameraElevation) * DEG_TO_RAD;
  const sinElev = Math.sin(elevRad);

  if (Math.abs(sinElev) < 1e-6) {
    throw new Error(`Camera elevation ${cameraElevation} is too close to horizontal.`);
  }

  const deltaRotX = shiftRightMeters;
  const deltaRotY = shiftUpMeters / sinElev;

  // Step 4: Rotate by azimuth to get east/north in world coordinates
  // Azimuth 0 = North, positive = clockwise (East)
  const azRad = cameraAzimuth * DEG_TO_RAD;
  const cosAz = Math.cos(azRad);
  const sinAz = Math.sin(azRad);

  const deltaEastMeters = deltaRotX * cosAz + deltaRotY * sinAz;
  const deltaNorthMeters = -deltaRotX * sinAz + deltaRotY * cosAz;

  // Step 5: Convert meters to lat/lon
  const deltaLat = deltaNorthMeters / METERS_PER_DEGREE_LAT;
  const deltaLon = deltaEastMeters / (METERS_PER_DEGREE_LAT * Math.cos(originLat * DEG_TO_RAD));

  return {
    lat: originLat + deltaLat,
    lon: originLon + deltaLon,
  };
}

export interface QuadrantPlan {
  id: string;
  qx: number;
  qy: number;
  tileTl: Tile | null;
  tileTr: Tile | null;
  tileBl: Tile | null;
  tileBr: Tile | null;
}

export interface GenerateGridOptions {
  bounds: GeoBounds;
  tileSize: number;
  zoomLevel: number;
  viewConfig: ViewConfig;
}

export function generateGrid(options: GenerateGridOptions): Tile[] {
  const { bounds, tileSize, zoomLevel, viewConfig } = options;

  validateBounds(bounds);
  validateTileSize(tileSize);
  validateZoom(zoomLevel);

  const minX = lonToTileX(bounds.west, zoomLevel);
  const maxX = lonToTileX(bounds.east, zoomLevel);
  const minY = latToTileY(bounds.north, zoomLevel);
  const maxY = latToTileY(bounds.south, zoomLevel);

  const tiles: Tile[] = [];
  const now = new Date();

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      // Calculate view-space center for this tile
      // We use tile coordinates relative to minX, minY as the origin
      const relativeX = x - minX;
      const relativeY = y - minY;
      const center = calculateTileCenter(relativeX, relativeY, viewConfig, tileSize);

      tiles.push({
        id: `tile_${x}_${y}`,
        coord: { x, y },
        bounds: getTileBounds(x, y, zoomLevel),
        center,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return tiles;
}

export function generateQuadrants(
  tiles: Tile[],
  options: { includePartial?: boolean } = {}
): QuadrantPlan[] {
  if (tiles.length === 0) {
    return [];
  }

  const includePartial = options.includePartial ?? true;
  const tileMap = new Map<string, Tile>();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const tile of tiles) {
    tileMap.set(`${tile.coord.x}_${tile.coord.y}`, tile);
    minX = Math.min(minX, tile.coord.x);
    maxX = Math.max(maxX, tile.coord.x);
    minY = Math.min(minY, tile.coord.y);
    maxY = Math.max(maxY, tile.coord.y);
  }

  const minQx = Math.floor(minX / 2);
  const maxQx = Math.floor(maxX / 2);
  const minQy = Math.floor(minY / 2);
  const maxQy = Math.floor(maxY / 2);

  const quadrants: QuadrantPlan[] = [];

  for (let qy = minQy; qy <= maxQy; qy += 1) {
    for (let qx = minQx; qx <= maxQx; qx += 1) {
      const tl = tileMap.get(`${qx * 2}_${qy * 2}`) ?? null;
      const tr = tileMap.get(`${qx * 2 + 1}_${qy * 2}`) ?? null;
      const bl = tileMap.get(`${qx * 2}_${qy * 2 + 1}`) ?? null;
      const br = tileMap.get(`${qx * 2 + 1}_${qy * 2 + 1}`) ?? null;

      if (!includePartial && (!tl || !tr || !bl || !br)) {
        continue;
      }

      quadrants.push({
        id: `quad_${qx}_${qy}`,
        qx,
        qy,
        tileTl: tl,
        tileTr: tr,
        tileBl: bl,
        tileBr: br,
      });
    }
  }

  return quadrants;
}
