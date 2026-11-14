import type { Polygon } from 'geojson';
import type { LngLatBoundsLike } from 'mapbox-gl';

export const KM_PER_DEG_LAT = 110.574;

export function circlePolygon(lng: number, lat: number, km: number, steps = 64): Polygon {
  const dLat = km / KM_PER_DEG_LAT;
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (2 * Math.PI * i) / steps;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: 'Polygon', coordinates: [ring] };
}

export function boundsOf(points: { lat: number; lng: number }[]): LngLatBoundsLike {
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}
