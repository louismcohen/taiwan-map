import { HugeiconsIcon } from '@hugeicons/react';
import type { FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, type LayerProps, Marker, Source, useMap } from 'react-map-gl/mapbox';
import { cn } from '@/lib/utils';
import type { SavedPlace } from '../data/saved';
import { placeColor, placeIcon } from '../lib/placeIcon';

/** Group crowded saved places into numbered circles; when off, every place is its own marker. */
const CLUSTER_PLACES = false;

/** Keep in sync with `--duration-filter` in styles.css (chip + pin enter/exit). */
const FILTER_MS = 150;

const SOURCE = 'saved-places';
export const CLUSTER_LAYER = 'saved-clusters';

const clusterLayer: LayerProps = {
  id: CLUSTER_LAYER,
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#2b2824',
    'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 25, 23],
    'circle-stroke-width': 2.5,
    'circle-stroke-color': '#ffffff',
  },
};

const countLayer: LayerProps = {
  id: 'saved-cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
    'text-size': 12,
    'text-allow-overlap': true,
  },
  paint: { 'text-color': '#ffffff' },
};

interface Props {
  places: SavedPlace[];
  selected: SavedPlace | null;
  onClick: (place: SavedPlace) => void;
}

type PresentPlace = { place: SavedPlace; visible: boolean };

/** Saved places as HTML markers so they can show icons, clustered when they crowd if `CLUSTER_PLACES` is on. */
export function PlaceMarkers({ places, selected, onClick }: Props) {
  const present = usePresentPlaces(places);
  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: places.map((p) => ({
        type: 'Feature',
        properties: { id: p.id },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      })),
    }),
    [places],
  );
  const loose = useUnclusteredIds();

  return (
    <>
      <Source id={SOURCE} type="geojson" data={data} cluster={CLUSTER_PLACES} clusterRadius={42} clusterMaxZoom={13}>
        <Layer {...clusterLayer} />
        <Layer {...countLayer} />
      </Source>
      {present
        .filter(({ place }) => !CLUSTER_PLACES || loose.has(place.id) || place.id === selected?.id)
        .map(({ place, visible }) => {
          const active = place.id === selected?.id;
          return (
            <Marker
              key={place.id}
              longitude={place.lng}
              latitude={place.lat}
              style={active ? { zIndex: 1 } : undefined}
              onClick={(e) => {
                if (!visible) return;
                // Keep the map's own click handler from treating this as a click on empty map.
                e.originalEvent.stopPropagation();
                onClick(place);
              }}
            >
              <div
                title={place.name}
                aria-hidden={!visible}
                className={cn(
                  'flex size-[26px] cursor-pointer items-center justify-center rounded-full border-2 border-white bg-(--c) text-white shadow-[0_0_0_0_var(--c),0_2px_6px_rgba(0,0,0,0.35)] transition-[opacity,scale,box-shadow] duration-(--duration-filter) ease-(--ease-out) starting:opacity-0 starting:scale-[0.85] motion-reduce:scale-100 motion-reduce:starting:scale-100 motion-reduce:duration-100',
                  active && 'shadow-[0_0_0_2.5px_var(--c),0_2px_8px_rgba(0,0,0,0.4)]',
                  !visible && 'pointer-events-none scale-[0.85] opacity-0 motion-reduce:scale-100',
                )}
                style={{ '--c': placeColor(place) } as CSSProperties}
              >
                <HugeiconsIcon icon={placeIcon(place)} size={14} strokeWidth={2} />
              </div>
            </Marker>
          );
        })}
    </>
  );
}

/**
 * Keeps filtered-out pins mounted for one filter beat so opacity/scale can ease out,
 * matching the chip color transition. New pins enter via `@starting-style`.
 */
function usePresentPlaces(places: SavedPlace[]): PresentPlace[] {
  const [present, setPresent] = useState<PresentPlace[]>(() => places.map((place) => ({ place, visible: true })));
  const placesRef = useRef(places);
  placesRef.current = places;

  useEffect(() => {
    const nextById = new Map(places.map((p) => [p.id, p]));
    setPresent((prev) => {
      const prevIds = new Set(prev.map((item) => item.place.id));
      const next: PresentPlace[] = [];
      for (const item of prev) {
        const updated = nextById.get(item.place.id);
        if (updated) next.push({ place: updated, visible: true });
        else next.push({ ...item, visible: false });
      }
      for (const place of places) {
        if (!prevIds.has(place.id)) next.push({ place, visible: true });
      }
      return next;
    });

    const id = window.setTimeout(() => {
      const keep = new Set(placesRef.current.map((p) => p.id));
      setPresent((prev) =>
        prev.filter((item) => keep.has(item.place.id)).map((item) => ({ place: item.place, visible: true })),
      );
    }, FILTER_MS);
    return () => window.clearTimeout(id);
  }, [places]);

  return present;
}

/** Re-read on every render of the map, which follows zooms, pans and changes to the source's data. */
function useUnclusteredIds() {
  const { current: map } = useMap();
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!map || !CLUSTER_PLACES) return;
    const m = map.getMap();
    let key = '';
    const update = () => {
      if (!m.getSource(SOURCE) || !m.isSourceLoaded(SOURCE)) return;
      const next = new Set(
        m.querySourceFeatures(SOURCE, { filter: ['!', ['has', 'point_count']] }).map((f) => String(f.properties?.id)),
      );
      const nextKey = [...next].sort().join();
      if (nextKey === key) return;
      key = nextKey;
      setIds(next);
    };
    update();
    m.on('render', update);
    return () => {
      m.off('render', update);
    };
  }, [map]);

  return ids;
}

/** Zooms in far enough to break up the clicked cluster. */
export function expandCluster(map: MapboxMap, clusterId: number, center: [number, number]) {
  const source = map.getSource<GeoJSONSource>(SOURCE);
  source?.getClusterExpansionZoom(clusterId, (err, zoom) => {
    if (err || zoom == null) return;
    map.easeTo({ center, zoom: zoom + 0.5 });
  });
}
