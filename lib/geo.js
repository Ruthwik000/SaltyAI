/** Geodesy helpers shared by the fisherman map screens. */

export const KM_PER_NM = 1.852;
export const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/** Great-circle distance in nautical miles. */
export function distanceNM(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const km = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  return km / KM_PER_NM;
}

/** Initial great-circle bearing from `a` to `b`, in degrees true. */
export function bearingDeg(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

/** 16-point compass label for a true bearing. */
export function compassPoint(deg) {
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

/**
 * Ring of [lon, lat] pairs approximating a circle of `radiusNM` around a
 * point, for use as a GeoJSON polygon. The ring closes on itself.
 */
export function circleRing(center, radiusNM, steps = 72) {
  const radiusKm = radiusNM * KM_PER_NM;
  const angular = radiusKm / EARTH_RADIUS_KM;
  const lat1 = toRad(center.lat);
  const lon1 = toRad(center.lon);
  const ring = [];

  for (let i = 0; i <= steps; i += 1) {
    const brng = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) +
        Math.cos(lat1) * Math.sin(angular) * Math.cos(brng)
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
      );
    ring.push([toDeg(lon2), toDeg(lat2)]);
  }

  return ring;
}

/** Speed between two timestamped fixes, in knots. Null when time did not advance. */
export function speedKnots(from, to) {
  const hours = (to.at - from.at) / 3_600_000;
  if (hours <= 0) return null;
  return distanceNM(from, to) / hours;
}

export function formatCoord(lat, lon) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${ns}, ${Math.abs(lon).toFixed(3)}°${ew}`;
}
