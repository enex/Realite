/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a location is within a given radius of a center point
 * @param centerLat Center latitude in degrees
 * @param centerLon Center longitude in degrees
 * @param targetLat Target latitude in degrees
 * @param targetLon Target longitude in degrees
 * @param radiusMeters Radius in meters
 * @returns True if target is within radius of center
 */
export function isWithinRadius(
  centerLat: number,
  centerLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number,
): boolean {
  const distance = calculateDistance(
    centerLat,
    centerLon,
    targetLat,
    targetLon,
  );
  return distance <= radiusMeters;
}
