import { useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { SEGMENTS, TRIP_BOUNDS, TRIP_PADDING, isSameSelection, type Selection } from './data/derive';
import { Sidebar } from './components/Sidebar';
import { TripMap } from './components/TripMap';
import { useRoutes } from './hooks/useRoutes';

export function App() {
  const mapRef = useRef<MapRef>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const routes = useRoutes(SEGMENTS);

  const reset = () => {
    setSelection(null);
    mapRef.current?.fitBounds(TRIP_BOUNDS, { padding: TRIP_PADDING, essential: true });
  };

  const focus = (sel: Selection) => {
    if (isSameSelection(selection, sel)) {
      reset();
      return;
    }
    setSelection(sel);
    const place = sel.kind === 'stop' ? sel.stop : sel.town;
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: sel.kind === 'stop' ? 13 : 12, essential: true });
  };

  return (
    <>
      <Sidebar selection={selection} onSelect={focus} routes={routes} />
      <TripMap mapRef={mapRef} selection={selection} onSelect={setSelection} onReset={reset} routes={routes} />
    </>
  );
}
