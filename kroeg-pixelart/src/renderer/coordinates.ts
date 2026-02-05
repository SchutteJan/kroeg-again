import type { GeoBounds } from '../types.js';

export interface ECEFCoord {
  x: number;
  y: number;
  z: number;
}

export interface CameraSetup {
  position: ECEFCoord;
  target: ECEFCoord;
  up: ECEFCoord;
  viewExtent: number;
}

const WGS84_A = 6378137.0; // Semi-major axis (equatorial radius)
const WGS84_E2 = 0.00669437999014; // First eccentricity squared

/**
 * Convert latitude/longitude to ECEF (Earth-Centered, Earth-Fixed) coordinates.
 * Uses WGS84 ellipsoid parameters.
 */
export function latLonToECEF(lat: number, lon: number, altitude: number = 0): ECEFCoord {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  // Radius of curvature in the prime vertical
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);

  const x = (N + altitude) * cosLat * cosLon;
  const y = (N + altitude) * cosLat * sinLon;
  const z = (N * (1 - WGS84_E2) + altitude) * sinLat;

  return { x, y, z };
}

/**
 * Calculate the extent of geographic bounds in meters.
 * Uses Haversine formula for distance calculation.
 */
export function boundsExtentMeters(bounds: GeoBounds): { width: number; height: number } {
  const centerLat = (bounds.north + bounds.south) / 2;
  const latRad = (centerLat * Math.PI) / 180;

  // Approximate meters per degree at this latitude
  const metersPerDegreeLat = 111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerDegreeLon = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);

  const height = (bounds.north - bounds.south) * metersPerDegreeLat;
  const width = (bounds.east - bounds.west) * metersPerDegreeLon;

  return { width, height };
}

/**
 * Calculate the center of geographic bounds.
 */
export function boundsCenter(bounds: GeoBounds): { lat: number; lon: number } {
  return {
    lat: (bounds.north + bounds.south) / 2,
    lon: (bounds.east + bounds.west) / 2,
  };
}

/**
 * Calculate the local "up" vector at a given lat/lon (normal to Earth's surface).
 */
export function localUpVector(lat: number, lon: number): ECEFCoord {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  return {
    x: Math.cos(latRad) * Math.cos(lonRad),
    y: Math.cos(latRad) * Math.sin(lonRad),
    z: Math.sin(latRad),
  };
}

/**
 * Calculate the local "north" vector at a given lat/lon.
 */
export function localNorthVector(lat: number, lon: number): ECEFCoord {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  return {
    x: -Math.sin(latRad) * Math.cos(lonRad),
    y: -Math.sin(latRad) * Math.sin(lonRad),
    z: Math.cos(latRad),
  };
}

/**
 * Calculate camera setup for rendering a tile with given bounds.
 * Camera is positioned at an isometric angle looking at the center of the bounds.
 *
 * @param bounds - Geographic bounds of the tile
 * @param cameraAngle - Elevation angle in degrees (30 = isometric)
 * @param cameraDistance - Distance multiplier from center (default: auto-calculated)
 */
export function calculateCameraSetup(
  bounds: GeoBounds,
  cameraAngle: number,
  cameraDistance?: number
): CameraSetup {
  const center = boundsCenter(bounds);
  const extent = boundsExtentMeters(bounds);
  const viewExtent = Math.max(extent.width, extent.height);

  // Target is at the center of bounds at ground level
  const target = latLonToECEF(center.lat, center.lon, 0);

  // Calculate camera position offset
  const elevationRad = (cameraAngle * Math.PI) / 180;
  const distance = cameraDistance ?? viewExtent * 2;

  // Get local coordinate frame at center
  const up = localUpVector(center.lat, center.lon);
  const north = localNorthVector(center.lat, center.lon);

  // Camera is positioned to the south and above the target
  // This makes north point "up" in the rendered image
  const horizontalDist = distance * Math.cos(elevationRad);
  const verticalDist = distance * Math.sin(elevationRad);

  const position: ECEFCoord = {
    x: target.x - north.x * horizontalDist + up.x * verticalDist,
    y: target.y - north.y * horizontalDist + up.y * verticalDist,
    z: target.z - north.z * horizontalDist + up.z * verticalDist,
  };

  return { position, target, up, viewExtent };
}
