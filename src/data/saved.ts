import { CATEGORIES, type Category, type Kind } from './placeKinds';
import { PLACE_OVERRIDES } from './placeOverrides';
import { SAVED_PLACES, type SyncedPlace } from './places';
import type { Stop } from './trip';

export const REGIONS = ['taipei', 'hualien', 'east', 'alishan', 'elsewhere'] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  taipei: 'Taipei',
  hualien: 'Hualien',
  east: 'Taitung & East Rift',
  alishan: 'Alishan',
  elsewhere: 'Elsewhere',
};

export interface SavedPlace {
  id: string;
  name: string;
  /** The name as saved in Google Maps, when an override replaced it. */
  savedName?: string;
  lat: number;
  lng: number;
  note?: string;
  category: Category;
  kind?: Kind;
  region: Region;
}

export interface SavedFilter {
  category: Category | 'all';
  region: Region | 'all';
}

export const NO_FILTER: SavedFilter = { category: 'all', region: 'all' };

function regionOf({ lat, lng }: { lat: number; lng: number }): Region {
  if (lat > 24.6) return 'taipei';
  if (lng > 121.3 && lat > 23.8) return 'hualien';
  if (lng > 120.95) return 'east';
  if (lng > 120.55 && lat > 23.3 && lat < 23.8) return 'alishan';
  return 'elsewhere';
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

const STOPWORDS = new Set(['the', 'of', 'and']);
const wordsOf = (name: string) =>
  name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

/**
 * The same place as a stop: practically on top of it, or nearby with every word of one name in the other,
 * so "Yuli" matches "Yuli Noodles" but "Old Donghe Bridge" doesn't match "Donghe Bun Shop".
 */
function matchesStop(place: SyncedPlace, stop: Stop) {
  const d = km(place, stop);
  if (d < 0.15) return true;
  if (d > 2) return false;
  const a = wordsOf(place.name);
  const b = wordsOf(stop.name);
  if (!a.length || !b.length) return false;
  const [short, long] = a.length <= b.length ? [a, new Set(b)] : [b, new Set(a)];
  return short.every((w) => long.has(w));
}

/** Saved places to show beside the route, without the ones that already are route stops. */
export function savedPlacesFor(stops: Stop[]) {
  const places: SavedPlace[] = [];
  let onRoute = 0;
  for (const synced of SAVED_PLACES) {
    const o = PLACE_OVERRIDES[synced.id] ?? {};
    if (o.hidden) continue;
    if (o.onRoute ?? stops.some((s) => matchesStop(synced, s))) {
      onRoute++;
      continue;
    }
    const category = o.category && CATEGORIES.includes(o.category) ? o.category : synced.category;
    const kind = o.kind === null ? undefined : (o.kind ?? (o.category ? undefined : synced.kind));
    places.push({
      id: synced.id,
      name: o.name ?? synced.name,
      ...(o.name && o.name !== synced.name && { savedName: synced.name }),
      lat: synced.lat,
      lng: synced.lng,
      ...(synced.note && { note: synced.note }),
      category,
      ...(kind && { kind }),
      region: regionOf(synced),
    });
  }
  return { places, onRoute };
}

export const matchesFilter = (place: SavedPlace, filter: SavedFilter) =>
  (filter.category === 'all' || place.category === filter.category) &&
  (filter.region === 'all' || place.region === filter.region);

export const savedPlaceUrl = (place: SavedPlace) => `https://maps.google.com/?cid=${place.id}`;

/** Distance in km to the closest stop, for "near the route" hints. */
export function nearestStop<S extends Stop>(place: SavedPlace, stops: S[]) {
  let best: { stop: S; km: number } | null = null;
  for (const stop of stops) {
    const d = km(place, stop);
    if (!best || d < best.km) best = { stop, km: d };
  }
  return best;
}
