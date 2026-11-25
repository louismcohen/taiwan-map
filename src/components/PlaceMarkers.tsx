import { HugeiconsIcon } from '@hugeicons/react';
import type { FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { Layer, type LayerProps, Marker, Source, useMap } from 'react-map-gl/mapbox';
import { cn } from '@/lib/utils';
import type { SavedPlace } from '../data/saved';
import { placeColor, placeIcon } from '../lib/placeIcon';

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

/** Saved places, clustered when they crowd; places out of a cluster are HTML markers so they can show icons. */
export function PlaceMarkers({ places, selected, onClick }: Props) {
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
      <Source id={SOURCE} type="geojson" data={data} cluster clusterRadius={42} clusterMaxZoom={13}>
        <Layer {...clusterLayer} />
        <Layer {...countLayer} />
      </Source>
      {places
        .filter((p) => loose.has(p.id) || p.id === selected?.id)
        .map((place) => {
          const active = place.id === selected?.id;
          return (
            <Marker
              key={place.id}
              longitude={place.lng}
              latitude={place.lat}
              style={active ? { zIndex: 1 } : undefined}
              onClick={(e) => {
                // Keep the map's own click handler from treating this as a click on empty map.
                e.originalEvent.stopPropagation();
                onClick(place);
              }}
            >
              <div
                title={place.name}
                className={cn(
                  'flex size-[26px] cursor-pointer items-center justify-center rounded-full border-2 border-white bg-(--c) text-white shadow-[0_0_0_0_var(--c),0_2px_6px_rgba(0,0,0,0.35)] transition-shadow duration-150 ease-out motion-reduce:transition-none',
                  active && 'shadow-[0_0_0_2.5px_var(--c),0_2px_8px_rgba(0,0,0,0.4)]',
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

/** Re-read on every render of the map, which follows zooms, pans and changes to the source's data. */
function useUnclusteredIds() {
  const { current: map } = useMap();
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!map) return;
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
