/**
 * Pulls the shared Google Maps list into src/data/places.ts. Places already in that file keep their
 * category, so only new ones are classified: by Google Places types when GOOGLE_PLACES_KEY is set,
 * otherwise from the name and note alone. Corrections belong in src/data/placeOverrides.ts.
 * The file is only rewritten when the list changed, so scheduled runs don't commit noise.
 *
 *   pnpm places [--reclassify]
 */
import { writeFile } from 'node:fs/promises';
import { type Classification, classify } from '../src/data/placeKinds.ts';
import { SAVED_LIST, SAVED_PLACES, type SyncedPlace } from '../src/data/places.ts';

const LIST_ID = process.env.SAVED_LIST_ID || '9mpCSKUqxsBtG5zVjJuFAA';
const KEY = process.env.GOOGLE_PLACES_KEY ?? '';
const reclassify = process.argv.includes('--reclassify');
const OUT = new URL('../src/data/places.ts', import.meta.url);

/** Unofficial endpoint behind the list's share page; the list must stay shared by link. */
const listUrl = (id: string) =>
  `https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=en&gl=us&pb=${encodeURIComponent(
    `!1m4!1s${id}!2e1!3m1!1e1!2e2!3e2!4i500!16b1`,
  )}`;

interface RawPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  note?: string;
  address?: string;
}

interface RawList {
  name: string;
  owner: string;
  places: RawPlace[];
}

/** Google's feature id is a pair of signed 64-bit numbers; the second, read unsigned, is the place's `cid`. */
const cidOf = (low: string) => BigInt.asUintN(64, BigInt(low)).toString();

function fail(message: string): never {
  throw new Error(`${message} Google may have changed the list response; the app keeps its last synced places.`);
}

async function fetchList(id: string): Promise<RawList> {
  const res = await fetch(listUrl(id));
  if (!res.ok) fail(`List request failed with ${res.status}.`);
  const text = await res.text();
  // The body is JSON behind an anti-XSSI prefix.
  const json = JSON.parse(text.slice(text.indexOf('\n') + 1));
  const list = json?.[0];
  if (!Array.isArray(list) || typeof list[4] !== 'string' || !Array.isArray(list[8])) fail('Unexpected list shape.');

  const places = list[8].map((item: unknown[], i: number): RawPlace => {
    const info = item?.[1] as unknown[] | undefined;
    const coords = info?.[5] as unknown[] | undefined;
    const fid = info?.[6] as unknown[] | undefined;
    const name = item?.[2];
    if (typeof name !== 'string' || typeof coords?.[2] !== 'number' || typeof coords?.[3] !== 'number') {
      fail(`Unexpected shape for place ${i + 1}.`);
    }
    const note = typeof item[3] === 'string' && item[3].trim() ? item[3].trim() : undefined;
    const address = typeof info?.[4] === 'string' && info[4] ? info[4] : undefined;
    return {
      id: typeof fid?.[1] === 'string' ? cidOf(fid[1]) : `${coords[2]},${coords[3]}`,
      name: name.trim(),
      lat: Number(coords[2].toFixed(6)),
      lng: Number(coords[3].toFixed(6)),
      ...(note && { note }),
      ...(address && { address }),
    };
  });
  return { name: list[4], owner: (list[3] as unknown[] | undefined)?.[0] as string, places };
}

interface PlacesResult {
  location?: { latitude: number; longitude: number };
  primaryType?: string;
  types?: string[];
}

function km(a: { lat: number; lng: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.lat) * rad;
  const dLng = (b.longitude - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

async function placeTypes(place: RawPlace): Promise<string[] | undefined> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.location,places.primaryType,places.types',
    },
    body: JSON.stringify({
      textQuery: place.name,
      pageSize: 3,
      locationBias: { circle: { center: { latitude: place.lat, longitude: place.lng }, radius: 300 } },
    }),
  });
  if (!res.ok) throw new Error(`Places lookup failed for ${place.name}: ${res.status} ${await res.text()}`);
  const { places } = (await res.json()) as { places?: PlacesResult[] };
  const match = places?.find((p) => p.location && km(place, p.location) < 0.5);
  if (!match) return undefined;
  return [...new Set([match.primaryType, ...(match.types ?? [])].filter((t): t is string => !!t))];
}

async function classifyPlace(place: RawPlace): Promise<Classification> {
  const types = KEY ? await placeTypes(place) : undefined;
  return classify({ name: place.name, note: place.note, types });
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const list = await fetchList(LIST_ID);
const previous = new Map(SAVED_PLACES.map((p) => [p.id, p]));
const next: SyncedPlace[] = [];

for (const place of list.places) {
  const known = previous.get(place.id);
  const { category, kind } = known && !reclassify ? known : await classifyPlace(place);
  next.push({ ...place, category, ...(kind && { kind }) });
}

const nextIds = new Set(next.map((p) => p.id));
const added = next.filter((p) => !previous.has(p.id));
const removed = SAVED_PLACES.filter((p) => !nextIds.has(p.id));
const changed = next.filter((p) => {
  const before = previous.get(p.id);
  return before && !sameJson(before, p);
});

for (const p of added) console.log(`+ ${p.name} (${p.category}${p.kind ? `, ${p.kind}` : ''})`);
for (const p of removed) console.log(`- ${p.name}`);
for (const p of changed) console.log(`~ ${p.name}`);

const meta = { id: LIST_ID, name: list.name, owner: list.owner };
if (sameJson(next, SAVED_PLACES) && sameJson(meta, { ...SAVED_LIST, updatedAt: undefined })) {
  console.log(`${list.name}: ${next.length} places, no changes.`);
  process.exit(0);
}

const updated = { ...meta, updatedAt: new Date().toISOString() };
await writeFile(
  OUT,
  `// Generated by \`pnpm places\` (scripts/sync-places.ts) from the shared Google Maps list. Don't edit by hand:
// corrections go in placeOverrides.ts, which the app applies on top of this file.
import type { Category, Kind } from './placeKinds.ts';

export interface SyncedPlace {
  /** Google's \`cid\`; https://maps.google.com/?cid=<id> opens the place. */
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** The list owner's note on the place. */
  note?: string;
  address?: string;
  category: Category;
  kind?: Kind;
}

export const SAVED_LIST = ${JSON.stringify(updated, null, 2)};

export const SAVED_PLACES: SyncedPlace[] = ${JSON.stringify(next, null, 2)};
`,
);
console.log(
  `${list.name}: ${next.length} places (${added.length} added, ${removed.length} removed, ${changed.length} changed).`,
);
