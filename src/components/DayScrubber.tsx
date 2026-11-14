import { BedIcon, Location01Icon, Train01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { DAY_KEYS, isPrimary, STOPS } from '../data/derive';
import { DAYS, type DayKey, NIGHTS } from '../data/trip';
import { useDayScroll } from '../hooks/useDayScroll';
import type { RouteResult } from '../lib/directions';
import { routeStats } from '../lib/format';

const STOP_COUNTS = Object.fromEntries(
  DAY_KEYS.map((day) => [day, STOPS.filter((s) => s.day === day).length]),
) as Record<DayKey, number>;

/** Segments are sized by each day's share of list rows, so dragging moves through the list evenly. */
const WEIGHTS = Object.fromEntries(DAY_KEYS.map((day) => [day, STOP_COUNTS[day] + NIGHTS[day].length])) as Record<
  DayKey,
  number
>;
const TOTAL_WEIGHT = DAY_KEYS.reduce((sum, day) => sum + WEIGHTS[day], 0);

const overnight = (day: DayKey) => {
  const towns = NIGHTS[day];
  return towns.find(isPrimary) ?? towns[0];
};

interface Props {
  /** The scrolling element that holds the day sections. */
  list: HTMLElement | null;
  routes: RouteResult[] | null;
  /** Pins the scrubber to the top of `list`, which it then sits inside. */
  sticky?: boolean;
  onPick?: (day: DayKey) => void;
}

/** The current day, a bar to scrub through the whole trip, and the day's stop count and overnight. */
export function DayScrubber({ list, routes, sticky = false, onPick }: Props) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const segments = useRef<Partial<Record<DayKey, HTMLDivElement | null>>>({});
  const {
    position: { day, progress },
    scrollToDay,
    scrubTo,
  } = useDayScroll(list, sticky ? root : null);

  // Rows scrolled into view with `block: 'nearest'` must clear the pinned scrubber.
  useEffect(() => {
    if (!sticky || !root || !list) return;
    const observer = new ResizeObserver(() => {
      list.style.scrollPaddingTop = `${root.offsetHeight}px`;
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
      list.style.scrollPaddingTop = '';
    };
  }, [sticky, root, list]);

  const index = DAY_KEYS.indexOf(day);
  const { name, color } = DAYS[day];
  const stops = STOP_COUNTS[day];
  const town = overnight(day);
  const before = DAY_KEYS.slice(0, index).reduce((sum, d) => sum + WEIGHTS[d], 0);

  const pick = (next: DayKey) => {
    onPick?.(next);
    requestAnimationFrame(() => scrollToDay(next));
  };

  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    const rects = DAY_KEYS.map((d) => segments.current[d]?.getBoundingClientRect());
    const i = rects.findIndex((r) => r && e.clientX < r.right);
    const target = i < 0 ? DAY_KEYS.length - 1 : i;
    const rect = rects[target];
    if (rect) scrubTo(DAY_KEYS[target], Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const next = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: DAY_KEYS.length - 1,
    }[e.key];
    if (next == null) return;
    e.preventDefault();
    pick(DAY_KEYS[Math.min(DAY_KEYS.length - 1, Math.max(0, next))]);
  };

  return (
    <nav
      ref={setRoot}
      aria-label="Days"
      className={cn(
        'bg-background px-[22px] py-2.5 select-none in-data-[slot=drawer-popup]:px-4 in-data-[slot=drawer-popup]:py-3',
        sticky && 'sticky top-0 z-10 border-b',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold tracking-[0.08em] uppercase" style={{ color }}>
          {name}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {routeStats(routes?.find((r) => r.day === day))}
        </span>
      </div>

      {/* Sideways drags scrub; vertical ones still move the bottom sheet. */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Position in trip"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(((before + progress * WEIGHTS[day]) / TOTAL_WEIGHT) * 100)}
        aria-valuetext={`${name}, ${Math.round(progress * 100)}% through the day`}
        data-base-ui-swipe-ignore="x"
        className="flex cursor-pointer touch-pan-y gap-[3px] rounded-sm py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e);
        }}
        onKeyDown={onKeyDown}
      >
        {DAY_KEYS.map((d, i) => (
          <div
            key={d}
            ref={(el) => {
              segments.current[d] = el;
            }}
            className="relative h-1.5 rounded-full bg-[color-mix(in_srgb,var(--c)_22%,transparent)]"
            style={{ '--c': DAYS[d].hex, flex: `${WEIGHTS[d]} 1 0` } as CSSProperties}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div
                className="h-full origin-left bg-(--c)"
                style={{ transform: `scaleX(${i < index ? 1 : i === index ? progress : 0})` }}
              />
            </div>
            {i === index && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ transform: `translateX(${progress * 100}%)` }}
              >
                <div className="absolute top-1/2 left-0 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--c) bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-[3px]">
        {DAY_KEYS.map((d) => (
          <button
            key={d}
            type="button"
            className={cn(
              '-my-1 min-w-0 rounded-sm py-1 text-left text-[11px] font-semibold text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
              d === day && 'text-(--c)',
            )}
            style={{ '--c': DAYS[d].hex, flex: `${WEIGHTS[d]} 1 0` } as CSSProperties}
            aria-label={DAYS[d].name}
            aria-current={d === day || undefined}
            onClick={() => pick(d)}
          >
            {DAYS[d].name.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 border-t border-dashed pt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <HugeiconsIcon icon={Location01Icon} size={13} strokeWidth={2} className="shrink-0" />
          {stops} {stops === 1 ? 'stop' : 'stops'}
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <HugeiconsIcon icon={town ? BedIcon : Train01Icon} size={13} strokeWidth={2} className="shrink-0" />
          <span className="truncate font-semibold text-foreground">
            {town ? `Night in ${town.name}` : 'Evening train to Taipei'}
          </span>
        </span>
      </div>
    </nav>
  );
}
