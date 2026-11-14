import type { CSSProperties, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { DAY_KEYS, type Selection } from '../data/derive';
import { DAYS, type DayKey } from '../data/trip';
import type { RouteResult } from '../lib/directions';
import { fmtKm, fmtTime } from '../lib/format';
import { DaySection } from './DaySection';

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

export function TripHeader({ routes, children }: { routes: RouteResult[] | null; children?: ReactNode }) {
  return (
    <header className="px-[22px] pt-6 pb-4 in-data-[slot=drawer-popup]:px-4 in-data-[slot=drawer-popup]:pt-0.5 in-data-[slot=drawer-popup]:pb-3">
      <h1 className="mb-1 text-xl font-bold tracking-[-0.01em] in-data-[slot=drawer-popup]:text-[17px]">
        East Rift &amp; Coast by Scooter
      </h1>
      <p className="text-[13px] text-muted-foreground">
        Taitung → Hualien · Wed–Sat · outlined stops are suggested additions
      </p>
      <div className="mt-2.5 text-[13px] font-semibold">{totalsText(routes)}</div>
      {children}
    </header>
  );
}

export function DayChips({ active, onPick }: { active: DayKey; onPick: (day: DayKey) => void }) {
  return (
    <div className="mt-2.5 flex gap-1.5">
      {DAY_KEYS.map((day) => (
        <Button
          key={day}
          variant="outline"
          size="sm"
          className={cn(
            'h-auto gap-[5px] rounded-full bg-card px-[9px] py-1 text-xs font-semibold before:size-[7px] before:rounded-full before:bg-(--c)',
            day === active && 'border-(--c) bg-(--c) text-white before:bg-white hover:bg-(--c) hover:text-white',
          )}
          style={{ '--c': DAYS[day].hex } as CSSProperties}
          aria-current={day === active || undefined}
          onClick={() => onPick(day)}
        >
          {DAYS[day].name.slice(0, 3)}
        </Button>
      ))}
    </div>
  );
}

export function DayList({ selection, onSelect, routes }: Props) {
  return (
    <div>
      {DAY_KEYS.map((day) => (
        <DaySection
          key={day}
          day={day}
          route={routes?.find((r) => r.day === day)}
          selection={selection}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function Sidebar(props: Props) {
  return (
    <aside className="h-full w-[380px] shrink-0 overflow-y-auto border-r bg-background">
      <TripHeader routes={props.routes} />
      <Separator />
      <DayList {...props} />
    </aside>
  );
}
