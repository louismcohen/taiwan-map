import { boundsOf } from '../lib/geo';
import { DAYS, NIGHTS, STOPS as TRIP_STOPS, type DayKey, type Stop, type Town } from './trip';

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

const PRIMARY_TAGS = new Set(['Booked', 'Recommended']);
export const isPrimary = (town: Town) => PRIMARY_TAGS.has(town.tag);
