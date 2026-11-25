import { type Ref, useState } from 'react';
import { DAY_KEYS, type Selection } from '../data/derive';
import type { SavedFilter, SavedPlace } from '../data/saved';
import type { DayKey } from '../data/trip';
import type { RouteResult } from '../lib/directions';
import { fmtKm, fmtTime } from '../lib/format';
import { DayScrubber } from './DayScrubber';
import { DaySection } from './DaySection';
import type { MapMode } from './ModeMenu';
import { SavedFilters, SavedHeader, SavedList } from './SavedList';

interface Props {
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  routes: RouteResult[] | null;
}

function totalsText(routes: RouteResult[] | null) {
  if (!routes) return 'Calculating route…';
  let dist = 0;
  let dur = 0;
  for (const r of routes) {
    if (r.distance == null || r.duration == null) return 'Some segments could not be routed';
    dist += r.distance;
    dur += r.duration;
  }
  return `${fmtKm(dist)} total · ~${fmtTime(dur)} riding`;
}

export function TripHeader({ routes, hidden }: { routes: RouteResult[] | null; hidden?: boolean }) {
  return (
    <header
      hidden={hidden}
      className="border-b px-[22px] pt-6 pb-4 in-data-[slot=drawer-popup]:px-4 in-data-[slot=drawer-popup]:pt-2 in-data-[slot=drawer-popup]:pb-4"
    >
      <h1 className="mb-1 text-xl font-bold tracking-[-0.01em] in-data-[slot=drawer-popup]:text-[17px]">
        East Rift &amp; Coast by Scooter
      </h1>
      <p className="text-[13px] text-muted-foreground">
        Taitung → Hualien · Wed–Sat · outlined stops are suggested additions
      </p>
      <div className="mt-2.5 text-[13px] font-semibold">{totalsText(routes)}</div>
    </header>
  );
}

export function DayList({
  ref,
  selection,
  onSelect,
  hidden,
}: Pick<Props, 'selection' | 'onSelect'> & { ref?: Ref<HTMLDivElement>; hidden?: boolean }) {
  return (
    <div ref={ref} hidden={hidden}>
      {DAY_KEYS.map((day) => (
        <DaySection key={day} day={day} selection={selection} onSelect={onSelect} />
      ))}
    </div>
  );
}

interface SidebarProps extends Props {
  onPickDay: (day: DayKey) => void;
  mode: MapMode;
  places: SavedPlace[];
  filter: SavedFilter;
  onFilterChange: (filter: SavedFilter) => void;
}

export function Sidebar({
  selection,
  onSelect,
  routes,
  onPickDay,
  mode,
  places,
  filter,
  onFilterChange,
}: SidebarProps) {
  const [list, setList] = useState<HTMLElement | null>(null);
  return (
    <aside ref={setList} className="h-full w-[380px] shrink-0 overflow-y-auto border-r bg-background">
      {mode === 'route' ? (
        <>
          <TripHeader routes={routes} />
          <DayScrubber list={list} routes={routes} sticky onPick={onPickDay} />
          <DayList selection={selection} onSelect={onSelect} />
        </>
      ) : (
        <>
          <SavedHeader />
          <SavedFilters filter={filter} onChange={onFilterChange} />
          <SavedList
            places={places}
            selection={selection}
            onSelect={onSelect}
            filter={filter}
            onChange={onFilterChange}
          />
        </>
      )}
    </aside>
  );
}
