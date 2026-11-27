import { isOpenNow } from '../lib/hours';
import { type HourPeriod, isPlaceDetails, PLACE_DETAILS } from './placeDetails';
import { CATEGORIES, CATEGORY_LABELS, type Category, type Kind } from './placeKinds';
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
  /** Stable Google Places ID (`ChIJ…`), when enrichment found a match. */
  placeId?: string;
  website?: string;
  /** Monday-first opening-hours lines from Places. */
  hours?: string[];
  /** Structured periods for open-now checks in Asia/Taipei. */
  hourPeriods?: HourPeriod[];
  editorial?: string;
  reviewSummary?: string;
  cashOnly?: boolean;
  photos?: string[];
}

/** Off, then matching, then inverted. Same cycle as the search filter buttons. */
export type TriFilter = 'off' | 'yes' | 'no';

export function cycleTriFilter(mode: TriFilter): TriFilter {
  if (mode === 'off') return 'yes';
  if (mode === 'yes') return 'no';
  return 'off';
}

export interface SavedFilter {
  category: Category | 'all';
  region: Region | 'all';
  query: string;
  open: TriFilter;
  visited: TriFilter;
}

export const NO_FILTER: SavedFilter = {
  category: 'all',
  region: 'all',
  query: '',
  open: 'off',
  visited: 'off',
};

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
    const details = PLACE_DETAILS[synced.id];
    const enriched = isPlaceDetails(details) ? details : undefined;
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
      ...(enriched?.placeId && { placeId: enriched.placeId }),
      ...(enriched?.website && { website: enriched.website }),
      ...(enriched?.hours && { hours: enriched.hours }),
      ...(enriched?.hourPeriods && { hourPeriods: enriched.hourPeriods }),
      ...(enriched?.editorial && { editorial: enriched.editorial }),
      ...(enriched?.reviewSummary && { reviewSummary: enriched.reviewSummary }),
      ...(enriched?.cashOnly && { cashOnly: true }),
      ...(enriched?.photos?.length && { photos: enriched.photos }),
    });
  }
  return { places, onRoute };
}

function searchHaystack(place: SavedPlace) {
  const { label, short } = CATEGORY_LABELS[place.category];
  return [
    place.name,
    place.savedName,
    place.note,
    place.editorial,
    place.reviewSummary,
    label,
    short,
    REGION_LABELS[place.region],
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

/**
 * Open for the search filter. Places with no hours stay in "open now", matching a missing
 * hours feed rather than marking them closed. Explicit periods, including 24-hour, use Taipei time.
 */
function listedOpen(place: SavedPlace) {
  if (!place.hourPeriods?.length) return true;
  return isOpenNow(place.hourPeriods);
}

function passesTri(mode: TriFilter, value: boolean) {
  if (mode === 'yes') return value;
  if (mode === 'no') return !value;
  return true;
}

export const matchesFilter = (
  place: SavedPlace,
  filter: SavedFilter,
  isVisited: (place: SavedPlace) => boolean = () => false,
) => {
  if (filter.category !== 'all' && place.category !== filter.category) return false;
  if (filter.region !== 'all' && place.region !== filter.region) return false;
  if (!passesTri(filter.open, listedOpen(place))) return false;
  if (!passesTri(filter.visited, isVisited(place))) return false;
  const q = filter.query.trim().toLowerCase();
  return !q || searchHaystack(place).includes(q);
};

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
