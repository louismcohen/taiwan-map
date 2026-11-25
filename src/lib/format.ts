import type { Stop } from '../data/trip';
import type { RouteResult } from './directions';

export const gmapsUrl = (s: Stop) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.query || s.name)}`;

export const fmtKm = (m: number) => `${(m / 1000).toFixed(0)} km`;

export const fmtDistance = (km: number) =>
  km < 1 ? `${Math.max(1, Math.round(km * 10)) * 100} m` : `${km.toFixed(1)} km`;

export const fmtTime = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

export function routeStats(route: RouteResult | undefined) {
  if (!route) return '';
  if (route.distance == null || route.duration == null) return 'route unavailable';
  return `${fmtKm(route.distance)} · ${fmtTime(route.duration)}`;
}
