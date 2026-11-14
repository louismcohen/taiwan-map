import type { Stop } from '../data/trip';

export const gmapsUrl = (s: Stop) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.query || s.name)}`;

export const fmtKm = (m: number) => `${(m / 1000).toFixed(0)} km`;

export const fmtTime = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
