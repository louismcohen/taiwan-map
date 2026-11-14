import type { LngLatBoundsLike } from 'mapbox-gl';
import { gmapsUrl } from '../lib/format';
import { boundsOf } from '../lib/geo';
import { PHOTOS } from './photos';
import { DAYS, NIGHTS, NIGHT_NAMES, STOPS as TRIP_STOPS, type DayKey, type Stop, type Town } from './trip';

export type NumberedStop = Stop & { n: number };

export interface Segment {
  day: DayKey;
  stops: NumberedStop[];
}

export interface TownEntry {
  town: Town;
  day: DayKey;
}

export type Selection =
  | { kind: 'stop'; stop: NumberedStop }
  | { kind: 'town'; town: Town; day: DayKey; at?: [number, number] };

export const DAY_KEYS = Object.keys(DAYS) as DayKey[];

export const STOPS: NumberedStop[] = TRIP_STOPS.map((s, i) => ({ ...s, n: i + 1 }));

const ROUTE_STOPS = STOPS.filter((s) => !s.offRoute);

// Each day's ride starts where the previous day ended, so the first day has no segment.
export const SEGMENTS: Segment[] = DAY_KEYS.flatMap((day) => {
  const firstIdx = ROUTE_STOPS.findIndex((s) => s.day === day);
  const lastIdx = ROUTE_STOPS.findLastIndex((s) => s.day === day);
  if (firstIdx < 1) return [];
  return [{ day, stops: ROUTE_STOPS.slice(firstIdx - 1, lastIdx + 1) }];
});

export const TOWNS: TownEntry[] = DAY_KEYS.flatMap((day) => NIGHTS[day].map((town) => ({ town, day })));

export const TRIP_BOUNDS = boundsOf(STOPS);
export const TRIP_PADDING = 60;

export const DAY_BOUNDS = Object.fromEntries(
  DAY_KEYS.map((day) => [day, boundsOf([...STOPS.filter((s) => s.day === day), ...NIGHTS[day]])]),
) as Record<DayKey, LngLatBoundsLike>;

/** Everything selectable, in sidebar order: each day's stops, then its places to stay. */
export const ITINERARY: Selection[] = DAY_KEYS.flatMap((day) => [
  ...STOPS.filter((s) => s.day === day).map((stop): Selection => ({ kind: 'stop', stop })),
  ...NIGHTS[day].map((town): Selection => ({ kind: 'town', town, day })),
]);

// Compared by name, not identity: a hot reload of this module recreates every stop and town.
export const isSameSelection = (a: Selection | null, b: Selection) =>
  a?.kind === 'stop'
    ? b.kind === 'stop' && a.stop.name === b.stop.name
    : a?.kind === 'town' && b.kind === 'town' && a.town.name === b.town.name;

export const pointOf = (sel: Selection): [number, number] =>
  sel.kind === 'stop' ? [sel.stop.lng, sel.stop.lat] : sel.at ?? [sel.town.lng, sel.town.lat];

export function describe(sel: Selection) {
  if (sel.kind === 'stop') {
    const { stop } = sel;
    const day = DAYS[stop.day];
    return {
      color: day.hex,
      label: `${day.name} · ${stop.label}`,
      title: stop.name,
      body: stop.desc,
      href: gmapsUrl(stop),
      photos: PHOTOS[stop.name] ?? [],
    };
  }
  const { town, day } = sel;
  return {
    color: DAYS[day].hex,
    label: `${NIGHT_NAMES[day]} · ${town.tag}`,
    title: town.name,
    body: town.note,
    href: undefined,
    photos: PHOTOS[town.name] ?? [],
  };
}

const PRIMARY_TAGS = new Set(['Booked', 'Recommended']);
export const isPrimary = (town: Town) => PRIMARY_TAGS.has(town.tag);
