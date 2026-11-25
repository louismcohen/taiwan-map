import type { LngLatBoundsLike } from 'mapbox-gl';
import { gmapsUrl } from '../lib/format';
import { boundsOf } from '../lib/geo';
import { placeColor } from '../lib/placeIcon';
import { PHOTOS } from './photos';
import { CATEGORY_LABELS } from './placeKinds';
import { REGION_LABELS, type SavedPlace, savedPlacesFor, savedPlaceUrl } from './saved';
import {
  DAYS,
  type Day,
  type DayKey,
  DEFAULT_VARIANT,
  daysFor,
  NIGHT_NAMES,
  nightsFor,
  type PlanVariant,
  type Stop,
  stopsFor,
  type Town,
} from './trip';

export type NumberedStop = Stop & { n: number };

export interface Segment {
  day: DayKey;
  stops: NumberedStop[];
}

export interface TownEntry {
  town: Town;
  day: DayKey;
}

/** Something on the scooter route: a stop or a place to stay. */
export type RouteSelection =
  | { kind: 'stop'; stop: NumberedStop }
  | { kind: 'town'; town: Town; day: DayKey; at?: [number, number] };

export type Selection = RouteSelection | { kind: 'place'; place: SavedPlace };

export interface TripData {
  variant: PlanVariant;
  days: Record<DayKey, Day>;
  stops: NumberedStop[];
  nights: Record<DayKey, Town[]>;
  segments: Segment[];
  towns: TownEntry[];
  itinerary: RouteSelection[];
  tripBounds: LngLatBoundsLike;
  dayBounds: Record<DayKey, LngLatBoundsLike>;
  /** Saved Google Maps places, without those that are route stops. */
  saved: SavedPlace[];
  /** How many saved places were left out for being route stops. */
  savedOnRoute: number;
}

export const DAY_KEYS = Object.keys(DAYS) as DayKey[];

export function deriveTrip(variant: PlanVariant = DEFAULT_VARIANT): TripData {
  const days = daysFor(variant);
  const nights = nightsFor(variant);
  const stops: NumberedStop[] = stopsFor(variant).map((s, i) => ({ ...s, n: i + 1 }));
  const routeStops = stops.filter((s) => !s.offRoute);

  const segments: Segment[] = DAY_KEYS.flatMap((day) => {
    const firstIdx = routeStops.findIndex((s) => s.day === day);
    const lastIdx = routeStops.findLastIndex((s) => s.day === day);
    if (firstIdx < 1) return [];
    return [{ day, stops: routeStops.slice(firstIdx - 1, lastIdx + 1) }];
  });

  const towns: TownEntry[] = DAY_KEYS.flatMap((day) => nights[day].map((town) => ({ town, day })));

  const itinerary: RouteSelection[] = DAY_KEYS.flatMap((day) => [
    ...stops.filter((s) => s.day === day).map((stop): RouteSelection => ({ kind: 'stop', stop })),
    ...nights[day].map((town): RouteSelection => ({ kind: 'town', town, day })),
  ]);
  const { places: saved, onRoute: savedOnRoute } = savedPlacesFor(stops);

  return {
    variant,
    days,
    stops,
    nights,
    segments,
    towns,
    itinerary,
    tripBounds: boundsOf(stops),
    dayBounds: Object.fromEntries(
      DAY_KEYS.map((day) => [day, boundsOf([...stops.filter((s) => s.day === day), ...nights[day]])]),
    ) as Record<DayKey, LngLatBoundsLike>,
    saved,
    savedOnRoute,
  };
}

/** Default Coast plan — kept for modules that only need types or static helpers. */
export const DEFAULT_TRIP = deriveTrip(DEFAULT_VARIANT);

export const STOPS = DEFAULT_TRIP.stops;
export const SEGMENTS = DEFAULT_TRIP.segments;
export const TOWNS = DEFAULT_TRIP.towns;
export const TRIP_BOUNDS = DEFAULT_TRIP.tripBounds;
export const TRIP_PADDING = 60;
export const DAY_BOUNDS = DEFAULT_TRIP.dayBounds;
export const ITINERARY = DEFAULT_TRIP.itinerary;

// Compared by name or id, not identity: a hot reload of this module recreates every stop and town.
export function isSameSelection(a: Selection | null, b: Selection) {
  if (a?.kind === 'stop') return b.kind === 'stop' && a.stop.name === b.stop.name;
  if (a?.kind === 'town') return b.kind === 'town' && a.town.name === b.town.name;
  return a?.kind === 'place' && b.kind === 'place' && a.place.id === b.place.id;
}

export function pointOf(sel: Selection): [number, number] {
  if (sel.kind === 'stop') return [sel.stop.lng, sel.stop.lat];
  if (sel.kind === 'place') return [sel.place.lng, sel.place.lat];
  return sel.at ?? [sel.town.lng, sel.town.lat];
}

export interface Description {
  color: string;
  label: string;
  title: string;
  /** Shown small under the title, e.g. the name a place was saved under. */
  subtitle?: string;
  body: string;
  href: string | undefined;
  photos: string[];
  website?: string;
  hours?: string[];
  editorial?: string;
  reviewSummary?: string;
  cashOnly?: boolean;
}

export function describe(sel: Selection, days: Record<DayKey, Day> = DAYS): Description {
  if (sel.kind === 'place') {
    const { place } = sel;
    return {
      color: placeColor(place),
      label: `${CATEGORY_LABELS[place.category].label} · ${REGION_LABELS[place.region]}`,
      title: place.name,
      subtitle: place.savedName,
      body: place.note ?? '',
      href: savedPlaceUrl(place),
      photos: place.photos ?? [],
      ...(place.website && { website: place.website }),
      ...(place.hours && { hours: place.hours }),
      ...(place.editorial && { editorial: place.editorial }),
      ...(place.reviewSummary && { reviewSummary: place.reviewSummary }),
      ...(place.cashOnly && { cashOnly: true }),
    };
  }
  if (sel.kind === 'stop') {
    const { stop } = sel;
    const day = days[stop.day];
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
    color: days[day].hex,
    label: `${NIGHT_NAMES[day]} · ${town.tag}`,
    title: town.name,
    body: town.note,
    href: undefined,
    photos: PHOTOS[town.name] ?? [],
  };
}

export const isPrimary = (town: Town) => town.tag === 'Recommended';

/** Remap a selection onto a new trip by name, or null if it vanished. */
export function resolveSelection(sel: Selection | null, trip: TripData): Selection | null {
  if (!sel) return null;
  if (sel.kind === 'stop') {
    const stop = trip.stops.find((s) => s.name === sel.stop.name);
    return stop ? { kind: 'stop', stop } : null;
  }
  if (sel.kind === 'place') {
    const place = trip.saved.find((p) => p.id === sel.place.id);
    return place ? { kind: 'place', place } : null;
  }
  const town = trip.nights[sel.day]?.find((t) => t.name === sel.town.name);
  return town ? { kind: 'town', town, day: sel.day, at: sel.at } : null;
}
