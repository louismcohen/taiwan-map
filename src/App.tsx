import type { LngLatBoundsLike } from 'mapbox-gl';
import { useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { BottomSheet, type SheetHeights, type Snap } from './components/BottomSheet';
import { SelectionDetail } from './components/SelectionDetail';
import { DayChips, DayList, Sidebar, TripHeader } from './components/Sidebar';
import { TripMap } from './components/TripMap';
import {
  DAY_BOUNDS,
  isSameSelection,
  pointOf,
  SEGMENTS,
  type Selection,
  TRIP_BOUNDS,
  TRIP_PADDING,
} from './data/derive';
import type { DayKey } from './data/trip';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useRoutes } from './hooks/useRoutes';

/** Keep in sync with the breakpoint in styles.css. */
const MOBILE_QUERY = '(max-width: 760px)';
/** A map tap closer than this to the sheet's top edge pans the map to keep the selection clear. */
const REVEAL_MARGIN = 24;

export function App() {
  const mapRef = useRef<MapRef>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [snap, setSnap] = useState<Snap>('peek');
  const [sheetHeights, setSheetHeights] = useState<SheetHeights | null>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const routes = useRoutes(SEGMENTS);

  // A full-height sheet hides the map anyway; aim the camera for when it comes back down.
  const insetFor = (s: Snap) => (isMobile && sheetHeights ? sheetHeights[s === 'full' ? 'half' : s] : 0);
  const padding = (s: Snap, base = 0) => ({ top: base, left: base, right: base, bottom: base + insetFor(s) });

  const moveSheet = (s: Snap) => {
    if (isMobile) setSnap(s);
    return s;
  };

  // Keep whatever size the user dragged the sheet to; only lift it out of `peek` to show content.
  const openSheet = () => moveSheet(snap === 'peek' ? 'half' : snap);

  const fit = (bounds: LngLatBoundsLike, s: Snap) =>
    mapRef.current?.fitBounds(bounds, {
      padding: padding(s, TRIP_PADDING),
      maxZoom: 12,
      retainPadding: false,
      essential: true,
    });

  const reset = () => {
    setSelection(null);
    fit(TRIP_BOUNDS, moveSheet('peek'));
  };

  const focus = (sel: Selection) => {
    if (isSameSelection(selection, sel)) {
      reset();
      return;
    }
    setSelection(sel);
    mapRef.current?.flyTo({
      center: pointOf(sel),
      zoom: sel.kind === 'stop' ? 13 : 12,
      padding: padding(openSheet()),
      retainPadding: false,
      essential: true,
    });
  };

  // Map taps select in place; on phones, pan only if the sheet would cover the selection.
  const selectOnMap = (sel: Selection | null) => {
    setSelection(sel);
    if (!isMobile) return;
    const s = sel ? openSheet() : moveSheet('peek');
    const map = mapRef.current;
    if (!sel || !map) return;
    const point = pointOf(sel);
    if (map.project(point).y > map.getContainer().clientHeight - insetFor(s) - REVEAL_MARGIN) {
      map.easeTo({ center: point, padding: padding(s), retainPadding: false });
    }
  };

  const showDay = (day: DayKey) => {
    setSelection(null);
    fit(DAY_BOUNDS[day], openSheet());
    requestAnimationFrame(() => document.getElementById(`day-${day}`)?.scrollIntoView({ block: 'start' }));
  };

  return (
    <>
      {!isMobile && <Sidebar selection={selection} onSelect={focus} routes={routes} />}
      {/* On phones, wait for the sheet's first measurement so the opening view clears it. */}
      {(!isMobile || sheetHeights) && (
        <TripMap
          mapRef={mapRef}
          selection={selection}
          onSelect={selectOnMap}
          onReset={reset}
          routes={routes}
          popups={!isMobile}
          initialPadding={padding('peek', TRIP_PADDING)}
          bottomInset={insetFor(snap)}
        />
      )}
      {isMobile && (
        <BottomSheet
          snap={snap}
          onSnapChange={setSnap}
          onHeightsChange={setSheetHeights}
          header={
            selection ? (
              <SelectionDetail selection={selection} onSelect={focus} onClose={() => setSelection(null)} />
            ) : (
              <TripHeader routes={routes}>
                <DayChips onPick={showDay} />
              </TripHeader>
            )
          }
        >
          <DayList selection={selection} onSelect={focus} routes={routes} />
        </BottomSheet>
      )}
    </>
  );
}
