import type { LngLatBoundsLike } from 'mapbox-gl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { BottomSheet, type DetailRest, type SheetHeights, type Snap } from './components/BottomSheet';
import { DayScrubber, type ScrubberFollow } from './components/DayScrubber';
import {
  FitMapButton,
  LOCATE_ZOOM,
  LocateMapButton,
  MapChrome,
  MapFabStack,
  type MapMode,
  ModeMenu,
} from './components/ModeMenu';
import { PlaceBackBar, SavedFilters, SavedHeader, SavedList, SavedSearch } from './components/SavedList';
import { SelectionDetail } from './components/SelectionDetail';
import { DayList, Sidebar, TripHeader } from './components/Sidebar';
import { TripMap } from './components/TripMap';
import type { UserLocationFix } from './components/UserLocation';
import { isSameSelection, pointOf, resolveSelection, type Selection, TRIP_PADDING } from './data/derive';
import { matchesFilter, NO_FILTER, type SavedFilter } from './data/saved';
import { TripProvider, useTrip } from './data/TripContext';
import type { DayKey } from './data/trip';
import { usePlaceVisited, VisitedProvider } from './data/visited';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useRoutes } from './hooks/useRoutes';
import { boundsOf } from './lib/geo';

/** Keep in sync with the breakpoint in styles.css. */
const MOBILE_QUERY = '(max-width: 760px)';
/** Matches the sheet's snap transition, so the pin and the sheet arrive together. */
const SHEET_MOVE_MS = 350;
const MODE_KEY = 'taiwan-map:mode';

const storedMode = (): MapMode => (localStorage.getItem(MODE_KEY) === 'saved' ? 'saved' : 'route');

export function App() {
  // Trip is locked to Coast (A). B/C + FridayPlanPicker remain in the codebase for later.
  return (
    <TripProvider>
      <VisitedProvider>
        <AppShell />
      </VisitedProvider>
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
  const [rest, setRest] = useState<DetailRest>('mid');
  const [sheetHeights, setSheetHeights] = useState<SheetHeights | null>(null);
  const [sheetBody, setSheetBody] = useState<HTMLDivElement | null>(null);
  const [dayList, setDayList] = useState<HTMLDivElement | null>(null);
  const [savedList, setSavedList] = useState<HTMLDivElement | null>(null);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocationFix | null>(null);
  const listScroll = useRef(0);
  const scrubber = useRef<ScrubberFollow>(null);
  /** The pin last framed against the sheet, so a shorter detail can be recentered once it's measured. */
  const framed = useRef<{ sel: Selection; inset: number; fit: number } | null>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const routes = useRoutes(trip.segments);
  /** On phones, a stop replaces the list below the day scrubber, and the sheet shrinks to fit them. */
  const showingStop = !!selection;

  const isVisitedPlace = usePlaceVisited();
  const places = useMemo(
    () => trip.saved.filter((p) => matchesFilter(p, filter, isVisitedPlace)),
    [trip.saved, filter, isVisitedPlace],
  );
  /** What "show all" frames: the scooter trip, or the pins visible in saved mode. */
  const overviewBounds = mode === 'saved' && places.length ? boundsOf(places) : trip.tripBounds;
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

  // A fully expanded list hides the map; frame the overview for the stop it falls back to.
  const routeInset = (s: Snap) => (isMobile && sheetHeights ? sheetHeights[s === 'full' ? 'half' : s] : 0);
  const padding = (inset: number, base = 0) => ({ top: base, left: base, right: base, bottom: base + inset });

  const moveSheet = (s: Snap) => {
    if (isMobile) setSnap(s);
    return s;
  };

  // Keep whatever size the user dragged the sheet to; only lift it out of `peek` to show content.
  const openSheet = () => moveSheet(snap === 'peek' ? 'half' : snap);

  const select = (sel: Selection | null) => {
    if (!sel) framed.current = null;
    if (sel && !selection && sheetBody) listScroll.current = sheetBody.scrollTop;
    // Opening a pin starts at half the screen, whatever height the sheet was dragged to before.
    if (sel && !selection) setRest('mid');
    setSelection(sel);
  };

  /**
   * How much of the map a selected pin's sheet covers. It opens at half the screen, unless the
   * content is shorter; dragged to its max, it covers that taller height instead.
   */
  const detailCover = (atMax: boolean) => {
    if (!isMobile || !sheetHeights) return 0;
    return Math.min(sheetHeights.fit, atMax ? sheetHeights.full : sheetHeights.mid);
  };

  /** Puts the pin in the middle of the map left visible above a sheet `inset` px tall. */
  const detailFit = sheetHeights?.fit ?? 0;
  const centerOnSheet = useCallback(
    (sel: Selection, inset: number) => {
      framed.current = { sel, inset, fit: detailFit };
      mapRef.current?.easeTo({
        center: pointOf(sel),
        padding: { top: 0, left: 0, right: 0, bottom: inset },
        duration: SHEET_MOVE_MS,
        retainPadding: false,
        essential: true,
      });
    },
    [detailFit],
  );

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
    fit(overviewBounds, routeInset(moveSheet('peek')));
  };

  const goToMe = () => {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        setUserLocation({
          lng: coords.longitude,
          lat: coords.latitude,
          accuracy: coords.accuracy,
        });
        mapRef.current?.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: LOCATE_ZOOM,
          padding: padding(showingStop ? detailCover(rest === 'max') : routeInset(snap)),
          retainPadding: false,
          essential: true,
        });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
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
    if (selection?.kind === 'place' && !matchesFilter(selection.place, f, isVisitedPlace)) select(null);
  };

  const focus = (sel: Selection) => {
    framed.current = null;
    if (isSameSelection(selection, sel)) {
      // Places stay at the current zoom; stops still fit the whole trip like the map pin toggle.
      if (sel.kind === 'place') {
        select(null);
        return;
      }
      reset();
      return;
    }
    const opening = !selection;
    select(sel);
    mapRef.current?.flyTo({
      center: pointOf(sel),
      zoom: sel.kind === 'town' ? 12 : sel.kind === 'place' ? 14 : 13,
      padding: padding(detailCover(!opening && rest === 'max')),
      retainPadding: false,
      essential: true,
    });
  };

  // A pin opens the sheet to half the screen and centers in the map that leaves visible.
  const selectOnMap = (sel: Selection | null) => {
    if (!sel) {
      framed.current = null;
      select(null);
      if (isMobile) moveSheet('peek');
      return;
    }
    setRest('mid');
    select(sel);
    if (isMobile && sheetHeights?.mid) centerOnSheet(sel, sheetHeights.mid);
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

  // A short detail never reaches half the screen; settle the pin in the gap that sheet actually leaves.
  useLayoutEffect(() => {
    const frame = framed.current;
    if (!frame || !selection || !sheetHeights || rest !== 'mid') return;
    if (!isSameSelection(frame.sel, selection) || sheetHeights.fit === frame.fit) return;
    const inset = Math.min(sheetHeights.fit, sheetHeights.mid);
    if (!inset || Math.abs(inset - frame.inset) < 2) return;
    centerOnSheet(selection, inset);
  }, [selection, sheetHeights, rest, centerOnSheet]);

  // A pan is the user taking the camera; don't pull the pin back when the sheet finishes measuring.
  useEffect(() => {
    if (!isMobile || !sheetHeights) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const release = (event: { originalEvent?: Event }) => {
      if (event.originalEvent) framed.current = null;
    };
    map.on('movestart', release);
    return () => {
      map.off('movestart', release);
    };
  }, [isMobile, sheetHeights]);

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
          initialBounds={overviewBounds}
          initialPadding={padding(routeInset('peek'), TRIP_PADDING)}
          userLocation={userLocation}
        >
          <MapChrome>
            <ModeMenu mode={mode} onChange={changeMode} />
            {mode === 'saved' && <SavedSearch filter={filter} onChange={changeFilter} />}
            <MapFabStack>
              <FitMapButton onClick={fitAll} />
              <LocateMapButton onClick={goToMe} busy={locating} />
            </MapFabStack>
          </MapChrome>
        </TripMap>
      )}
      {isMobile && (
        <BottomSheet
          snap={snap}
          onSnapChange={setSnap}
          onHeightsChange={setSheetHeights}
          bodyRef={setSheetBody}
          fit={showingStop}
          rest={rest}
          onRestChange={setRest}
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
              {selection ? <PlaceBackBar onBack={close} /> : <SavedFilters filter={filter} onChange={changeFilter} />}
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
