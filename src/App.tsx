import type { LngLatBoundsLike } from 'mapbox-gl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { BottomSheet, type SheetHeights, type Snap } from './components/BottomSheet';
import { DayScrubber } from './components/DayScrubber';
import { SelectionDetail } from './components/SelectionDetail';
import { DayList, Sidebar, TripHeader } from './components/Sidebar';
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
  const [sheetBody, setSheetBody] = useState<HTMLDivElement | null>(null);
  const [dayList, setDayList] = useState<HTMLDivElement | null>(null);
  const listScroll = useRef(0);
  /** The sheet's height around the last stop, to aim the camera before the next one is measured. */
  const lastFit = useRef<number | null>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const routes = useRoutes(SEGMENTS);
  /** On phones, a stop replaces the list below the day scrubber, and the sheet shrinks to fit them. */
  const showingStop = !!selection;

  // A full-height sheet hides the map anyway; aim the camera for when it comes back down.
  const routeInset = (s: Snap) => (isMobile && sheetHeights ? sheetHeights[s === 'full' ? 'half' : s] : 0);
  const padding = (inset: number, base = 0) => ({ top: base, left: base, right: base, bottom: base + inset });

  const moveSheet = (s: Snap) => {
    if (isMobile) setSnap(s);
    return s;
  };

  // Keep whatever size the user dragged the sheet to; only lift it out of `peek` to show content.
  const openSheet = () => moveSheet(snap === 'peek' ? 'half' : snap);

  const select = (sel: Selection | null) => {
    if (sel && !selection && sheetBody) listScroll.current = sheetBody.scrollTop;
    setSelection(sel);
  };

  /** How much of the map's bottom the sheet covers once it shows a stop. */
  const reveal = () => (isMobile ? (lastFit.current ?? routeInset('half')) : 0);

  const fit = (bounds: LngLatBoundsLike, inset: number) =>
    mapRef.current?.fitBounds(bounds, {
      padding: padding(inset, TRIP_PADDING),
      maxZoom: 12,
      retainPadding: false,
      essential: true,
    });

  const reset = () => {
    select(null);
    fit(TRIP_BOUNDS, routeInset(moveSheet('peek')));
  };

  const focus = (sel: Selection) => {
    if (isSameSelection(selection, sel)) {
      reset();
      return;
    }
    select(sel);
    mapRef.current?.flyTo({
      center: pointOf(sel),
      zoom: sel.kind === 'stop' ? 13 : 12,
      padding: padding(reveal()),
      retainPadding: false,
      essential: true,
    });
  };

  // Map taps select in place; on phones, pan only if the sheet would cover the selection.
  const selectOnMap = (sel: Selection | null) => {
    select(sel);
    if (!isMobile) return;
    if (!sel) {
      moveSheet('peek');
      return;
    }
    const inset = reveal();
    const map = mapRef.current;
    if (!map) return;
    const point = pointOf(sel);
    if (map.project(point).y > map.getContainer().clientHeight - inset - REVEAL_MARGIN) {
      map.easeTo({ center: point, padding: padding(inset), retainPadding: false });
    }
  };

  // The scrubber scrolls the list to the day itself.
  const showDay = (day: DayKey) => {
    select(null);
    fit(DAY_BOUNDS[day], routeInset(openSheet()));
  };

  const close = () => select(null);

  // The detail starts at the top; going back returns to where the list was.
  useLayoutEffect(() => {
    if (sheetBody) sheetBody.scrollTop = showingStop ? 0 : listScroll.current;
  }, [showingStop, sheetBody]);

  useEffect(() => {
    if (showingStop && sheetHeights) lastFit.current = sheetHeights.fit;
  }, [showingStop, sheetHeights]);

  const bottomInset = showingStop && isMobile ? (sheetHeights?.fit ?? 0) : routeInset(snap);

  return (
    <>
      {!isMobile && <Sidebar selection={selection} onSelect={focus} routes={routes} onPickDay={showDay} />}
      {/* On phones, wait for the sheet's first measurement so the opening view clears it. */}
      {(!isMobile || sheetHeights) && (
        <TripMap
          mapRef={mapRef}
          selection={selection}
          onSelect={selectOnMap}
          onReset={reset}
          routes={routes}
          popups={!isMobile}
          initialPadding={padding(routeInset('peek'), TRIP_PADDING)}
          bottomInset={bottomInset}
        />
      )}
      {isMobile && (
        <BottomSheet
          snap={snap}
          onSnapChange={setSnap}
          onHeightsChange={setSheetHeights}
          bodyRef={setSheetBody}
          fit={showingStop}
          onDismiss={showingStop ? close : undefined}
          peekTo={dayList}
        >
          <TripHeader routes={routes} hidden={showingStop} />
          <DayScrubber
            list={sheetBody}
            routes={routes}
            sticky
            onPick={showDay}
            current={selection ? { selection, onBack: close } : undefined}
          />
          {selection && (
            <div className="motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)] motion-safe:fade-in motion-safe:slide-in-from-right-12">
              <SelectionDetail selection={selection} onSelect={focus} />
            </div>
          )}
          <DayList ref={setDayList} selection={selection} onSelect={focus} hidden={showingStop} />
        </BottomSheet>
      )}
    </>
  );
}
