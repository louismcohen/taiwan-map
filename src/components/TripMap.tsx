import 'mapbox-gl/dist/mapbox-gl.css';
import type { PaddingOptions } from 'mapbox-gl';
import { type CSSProperties, type Ref, useState } from 'react';
import MapGL, { type MapMouseEvent, type MapRef, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import { isSameSelection, type Selection } from '../data/derive';
import { useTrip } from '../data/TripContext';
import { MAPBOX_TOKEN } from '../lib/config';
import type { RouteResult } from '../lib/directions';
import { InfoPopup } from './InfoPopup';
import { RouteLayers } from './RouteLayers';
import { STAY_FILL_LAYER, StayZones } from './StayZones';
import { StopMarkers } from './StopMarkers';

interface Props {
  mapRef: Ref<MapRef>;
  selection: Selection | null;
  onSelect: (selection: Selection | null) => void;
  onReset: () => void;
  routes: RouteResult[] | null;
  /** Off on phones, where the bottom sheet shows the selection instead. */
  popups: boolean;
  /** Only read when the map is created. */
  initialPadding: PaddingOptions;
  /** Height of UI covering the bottom of the map; bottom controls sit above it. */
  bottomInset: number;
}

const INTERACTIVE_LAYERS = [STAY_FILL_LAYER];

export function TripMap({ mapRef, selection, onSelect, onReset, routes, popups, initialPadding, bottomInset }: Props) {
  const { towns, tripBounds } = useTrip();
  const [cursor, setCursor] = useState('');

  const handleClick = (e: MapMouseEvent) => {
    const i: number | undefined = e.features?.[0]?.properties?.i;
    if (i == null) {
      onSelect(null);
      return;
    }
    const { town, day } = towns[i];
    onSelect({ kind: 'town', town, day, at: [e.lngLat.lng, e.lngLat.lat] });
  };

  return (
    <div id="map" className="h-full flex-1" style={{ '--bottom-inset': `${bottomInset}px` } as CSSProperties}>
      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        initialViewState={{ bounds: tripBounds, fitBoundsOptions: { padding: initialPadding } }}
        interactiveLayerIds={INTERACTIVE_LAYERS}
        cursor={cursor}
        onMouseEnter={() => setCursor('pointer')}
        onMouseLeave={() => setCursor('')}
        onClick={handleClick}
      >
        <NavigationControl position="top-right" />
        <ScaleControl unit="metric" position="bottom-right" />
        <StayZones />
        {routes && <RouteLayers routes={routes} />}
        <StopMarkers
          selected={selection?.kind === 'stop' ? selection.stop : null}
          onClick={(stop) =>
            isSameSelection(selection, { kind: 'stop', stop }) ? onReset() : onSelect({ kind: 'stop', stop })
          }
        />
        {popups && selection && <InfoPopup selection={selection} />}
      </MapGL>
    </div>
  );
}
