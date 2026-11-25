import type { LngLatBoundsLike } from 'mapbox-gl';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { BottomSheet, type SheetHeights, type Snap } from './components/BottomSheet';
import { DayScrubber, type ScrubberFollow } from './components/DayScrubber';
import { FitMapButton, type MapMode, ModeMenu } from './components/ModeMenu';
import { PlaceBackBar, SavedFilters, SavedHeader, SavedList } from './components/SavedList';
import { SelectionDetail } from './components/SelectionDetail';
import { DayList, Sidebar, TripHeader } from './components/Sidebar';
import { TripMap } from './components/TripMap';
import { isSameSelection, pointOf, resolveSelection, type Selection, TRIP_PADDING } from './data/derive';
import { matchesFilter, NO_FILTER, type SavedFilter } from './data/saved';
import { TripProvider, useTrip } from './data/TripContext';
import type { DayKey } from './data/trip';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useRoutes } from './hooks/useRoutes';
import { boundsOf } from './lib/geo';

/** Keep in sync with the breakpoint in styles.css. */
const MOBILE_QUERY = '(max-width: 760px)';
/** A map tap closer than this to the sheet's top edge pans the map to keep the selection clear. */
const REVEAL_MARGIN = 24;
const MODE_KEY = 'taiwan-map:mode';

const storedMode = (): MapMode => (localStorage.getItem(MODE_KEY) === 'saved' ? 'saved' : 'route');

export function App() {
  // Trip is locked to Coast (A). B/C + FridayPlanPicker remain in the codebase for later.
  return (
    <TripProvider>
      <AppShell />
    </TripProvider>
  );
}

function AppShell() {
  const trip = useTrip();
  const mapRef = useRef<MapRef>(null);
  const [mode, setMode] = useState<MapMode>(storedMode);
  const [filter, setFilter] = useState<SavedFilter>(NO_FILTER);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [snap, setSnap] = useState<Snap>('peek');
  const [sheetHeights, setSheetHeights] = useState<SheetHeights | null>(null);
  const [sheetBody, setSheetBody] = useState<HTMLDivElement | null>(null);
  const [dayList, setDayList] = useState<HTMLDivElement | null>(null);
  const [savedList, setSavedList] = useState<HTMLDivElement | null>(null);
  const listScroll = useRef(0);
  const scrubber = useRef<ScrubberFollow>(null);
  /** The sheet's height around the last stop, to aim the camera before the next one is measured. */
  const lastFit = useRef<number | null>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const routes = useRoutes(trip.segments);
  /** On phones, a stop replaces the list below the day scrubber, and the sheet shrinks to fit them. */
  const showingStop = !!selection;

  const places = useMemo(() => trip.saved.filter((p) => matchesFilter(p, filter)), [trip.saved, filter]);
  const sequence = useMemo<Selection[]>(
    () => (mode === 'route' ? trip.itinerary : places.map((place) => ({ kind: 'place', place }))),
    [mode, trip.itinerary, places],
  );
  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  // Drop a selection that disappeared when the Friday plan changed.
  useEffect(() => {
    setSelection((sel) => resolveSelection(sel, trip));
  }, [trip]);

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
    fit(trip.tripBounds, routeInset(moveSheet('peek')));
  };

  /** Manual overview: clear selection and fit whatever the current mode is showing. */
  const fitAll = () => {
    select(null);
    const bounds = mode === 'saved' && places.length ? boundsOf(places) : trip.tripBounds;
    fit(bounds, routeInset(moveSheet('peek')));
  };

  const changeMode = (m: MapMode) => {
    if (m === mode) return;
    setMode(m);
    select(null);
    const inset = routeInset(moveSheet('peek'));
    // Saved mode keeps the current camera; route mode reframes the trip.
    if (m === 'route') fit(trip.tripBounds, inset);
  };

  const changeFilter = (f: SavedFilter) => {
    setFilter(f);
    if (selection?.kind === 'place' && !matchesFilter(selection.place, f)) select(null);
  };

  const focus = (sel: Selection) => {
    if (isSameSelection(selection, sel)) {
      // Places stay at the current zoom; stops still fit the whole trip like the map pin toggle.
      if (sel.kind === 'place') {
        select(null);
        return;
      }
      reset();
      return;
    }
    select(sel);
    mapRef.current?.flyTo({
      center: pointOf(sel),
      zoom: sel.kind === 'town' ? 12 : sel.kind === 'place' ? 14 : 13,
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
    fit(trip.dayBounds[day], routeInset(openSheet()));
  };

  const close = () => select(null);

  // The detail starts at the top; going back returns to where the list was.
  useLayoutEffect(() => {
    if (sheetBody) sheetBody.scrollTop = showingStop ? 0 : listScroll.current;
  }, [showingStop, sheetBody]);

  useEffect(() => {
    if (showingStop && sheetHeights) lastFit.current = sheetHeights.fit;
  }, [showingStop, sheetHeights]);

  return (
    <>
      {!isMobile && (
        <Sidebar
          selection={selection}
          onSelect={focus}
          routes={routes}
          onPickDay={showDay}
          mode={mode}
          places={places}
          filter={filter}
          onFilterChange={changeFilter}
        />
      )}
      {/* On phones, wait for the sheet's first measurement so the opening view clears it. */}
      {(!isMobile || sheetHeights) && (
        <TripMap
          mapRef={mapRef}
          mode={mode}
          places={places}
          selection={selection}
          onSelect={selectOnMap}
          onReset={reset}
          routes={routes}
          popups={!isMobile}
          initialPadding={padding(routeInset('peek'), TRIP_PADDING)}
        >
          <ModeMenu mode={mode} onChange={changeMode} />
          <FitMapButton onClick={fitAll} />
        </TripMap>
      )}
      {isMobile && (
        <BottomSheet
          snap={snap}
          onSnapChange={setSnap}
          onHeightsChange={setSheetHeights}
          bodyRef={setSheetBody}
          fit={showingStop}
          onDismiss={showingStop ? close : undefined}
          peekTo={mode === 'route' ? dayList : savedList}
        >
          {mode === 'route' ? (
            <>
              <TripHeader routes={routes} hidden={showingStop} />
              <DayScrubber
                list={sheetBody}
                routes={routes}
                sticky
                onPick={showDay}
                current={selection && selection.kind !== 'place' ? { selection, onBack: close } : undefined}
                followRef={scrubber}
              />
            </>
          ) : (
            <>
              <SavedHeader hidden={showingStop} />
              {selection ? (
                <PlaceBackBar
                  index={sequence.findIndex((s) => isSameSelection(s, selection))}
                  count={sequence.length}
                  onBack={close}
                />
              ) : (
                <SavedFilters filter={filter} onChange={changeFilter} />
              )}
            </>
          )}
          {selection && (
            <div className="motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)] motion-safe:fade-in motion-safe:slide-in-from-right-12">
              <SelectionDetail
                selection={selection}
                sequence={sequence}
                onSelect={focus}
                scrubber={mode === 'route' ? scrubber : undefined}
              />
            </div>
          )}
          {mode === 'route' ? (
            <DayList ref={setDayList} selection={selection} onSelect={focus} hidden={showingStop} />
          ) : (
            <SavedList
              ref={setSavedList}
              places={places}
              selection={selection}
              onSelect={focus}
              filter={filter}
              onChange={changeFilter}
              hidden={showingStop}
            />
          )}
        </BottomSheet>
      )}
    </>
  );
}
