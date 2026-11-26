import { HugeiconsIcon } from '@hugeicons/react';
import type { FeatureCollection, Point } from 'geojson';
import { type CSSProperties, useMemo } from 'react';
import { Layer, type LayerProps, Marker, Source } from 'react-map-gl/mapbox';
import { cn } from '@/lib/utils';
import type { NumberedStop } from '../data/derive';
import { useTrip } from '../data/TripContext';
import { stopIcon } from '../lib/stopIcon';

interface Props {
  selected: NumberedStop | null;
  onClick: (stop: NumberedStop) => void;
}

/** Name labels beside stops when zoomed in; Mapbox tries top, then left/right, and hides collisions. */
function labelLayer(selectedName: string): LayerProps {
  return {
    id: 'stop-labels',
    type: 'symbol',
    // Layer exists slightly early so text-opacity can fade in instead of popping.
    minzoom: 9.5,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 9, 12, 15, 15],
      'text-variable-anchor': ['top', 'left', 'right'],
      // Slightly larger than place pins — stop pills include a number.
      'text-radial-offset': 1.4,
      'text-justify': 'auto',
      'text-max-width': 8,
      'text-allow-overlap': false,
      // Lower sort key places first, so the selected stop keeps its label when crowded.
      'symbol-sort-key': ['case', ['==', ['get', 'name'], selectedName], 0, 1],
    },
    paint: {
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 9.5, 0, 10.5, 1],
      'text-color': '#2b2824',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2.5,
      'text-halo-blur': 1.5,
    },
  };
}

export function StopMarkers({ selected, onClick }: Props) {
  const { stops, days } = useTrip();
  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: stops.map((s) => ({
        type: 'Feature',
        properties: { name: s.name },
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      })),
    }),
    [stops],
  );
  const labels = useMemo(() => labelLayer(selected?.name ?? ''), [selected?.name]);

  return (
    <>
      <Source id="stops" type="geojson" data={data}>
        <Layer {...labels} />
      </Source>
      {stops.map((stop) => (
        <Marker
          key={stop.name}
          longitude={stop.lng}
          latitude={stop.lat}
          style={selected?.name === stop.name ? { zIndex: 1 } : undefined}
          onClick={(e) => {
            // Keep the map's own click handler from treating this as a click on empty map.
            e.originalEvent.stopPropagation();
            onClick(stop);
          }}
        >
          <div
            className={cn(
              // The unselected shadow keeps a zero-width ring layer so the selected ring grows out of it.
              'flex h-[26px] cursor-pointer items-center gap-1 rounded-full border-2 border-white bg-(--c) pr-2 pl-1.5 text-xs leading-none font-bold text-white tabular-nums shadow-[0_0_0_0_var(--c),0_2px_6px_rgba(0,0,0,0.35)] transition-shadow duration-150 ease-out motion-reduce:transition-none',
              (stop.stay || stop.final) && 'rounded-[8px]',
              stop.suggested && 'border-(--c) bg-white text-(--c)',
              selected?.name === stop.name && 'shadow-[0_0_0_2.5px_var(--c),0_2px_8px_rgba(0,0,0,0.4)]',
            )}
            style={{ '--c': days[stop.day].hex } as CSSProperties}
          >
            <HugeiconsIcon icon={stopIcon(stop)} size={14} strokeWidth={2} />
            {stop.n}
          </div>
        </Marker>
      ))}
    </>
  );
}
