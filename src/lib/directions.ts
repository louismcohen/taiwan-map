import type { LineString } from 'geojson';
import type { Segment } from '../data/derive';
import type { DayKey } from '../data/trip';
import { getMapboxToken } from './config';

export interface RouteResult {
  day: DayKey;
  geometry: LineString;
  /** Meters; missing when routing failed and the geometry is a straight-line fallback. */
  distance?: number;
  /** Seconds. */
  duration?: number;
}

export async function fetchRoute(seg: Segment, signal?: AbortSignal): Promise<RouteResult> {
  const coords = seg.stops.map((s) => `${s.lng},${s.lat}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${getMapboxToken()}`;
  try {
    const res = await fetch(url, { signal });
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) throw new Error(data.message || 'No route');
    return { day: seg.day, geometry: route.geometry, distance: route.distance, duration: route.duration };
  } catch (err) {
    if (signal?.aborted) throw err;
    console.warn(`Directions failed for ${seg.day}, drawing straight lines`, err);
    return { day: seg.day, geometry: { type: 'LineString', coordinates: seg.stops.map((s) => [s.lng, s.lat]) } };
  }
}
