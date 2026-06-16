export const DEFAULT_NEARBY_RADIUS_KM = 15;
export const MAX_NEARBY_RADIUS_KM = 50;

export type Coordinates = {
  lat: number;
  lng: number;
};

export function isValidLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidCoordinatePair(lat: number, lng: number) {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

export function roundCoordinate(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function normalizeRadius(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_NEARBY_RADIUS_KM;

  return Math.min(Math.max(Math.round(value), 1), MAX_NEARBY_RADIUS_KM);
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
