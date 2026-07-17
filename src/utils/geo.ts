const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Floating-point rounding can move the Haversine value just outside its
  // mathematical [0, 1] range, especially for nearly antipodal points.
  const clampedX = Math.min(1, Math.max(0, x));
  const c = 2 * Math.atan2(Math.sqrt(clampedX), Math.sqrt(1 - clampedX));
  return EARTH_RADIUS_KM * c;
}
