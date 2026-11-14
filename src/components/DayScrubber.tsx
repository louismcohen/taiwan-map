import { ArrowLeft01Icon, BedIcon, Location01Icon, Train01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import {
  DAY_KEYS,
  ITINERARY,
  isPrimary,
  isSameSelection,
  type NumberedStop,
  type Selection,
  STOPS,
} from '../data/derive';
import { DAYS, type DayKey, NIGHTS } from '../data/trip';
import { useDayScroll } from '../hooks/useDayScroll';
import type { RouteResult } from '../lib/directions';
import { routeStats } from '../lib/format';

const DAY_STOPS = Object.fromEntries(DAY_KEYS.map((day) => [day, STOPS.filter((s) => s.day === day)])) as Record<
  DayKey,
  NumberedStop[]
>;

const STOP_COUNTS = Object.fromEntries(DAY_KEYS.map((day) => [day, DAY_STOPS[day].length])) as Record<DayKey, number>;

const ROW_COUNTS = Object.fromEntries(DAY_KEYS.map((day) => [day, STOP_COUNTS[day] + NIGHTS[day].length])) as Record<
  DayKey,
  number
>;
const TOTAL_STOPS = STOPS.length;
const LAST_DAY = DAY_KEYS[DAY_KEYS.length - 1];
/** Space between day segments in px. Must match the bar's `gap-[3px]`. */
const GAP = 3;

/**
 * The bar gives every stop an equal slot, its dot in the middle; a day's places to stay share the
 * half-slot after its last dot. A day's slots run on through the gap that follows its segment, so
 * dots stay evenly spaced across days. Maps a position through the day's rows (0–1) onto its slots.
 */
function toBar(day: DayKey, rowProgress: number) {
  const stops = STOP_COUNTS[day];
  const lastDot = stops - 0.5;
  const row = rowProgress * ROW_COUNTS[day];
  const slot = row <= lastDot ? row : lastDot + ((row - lastDot) * 0.5) / (ROW_COUNTS[day] - lastDot);
  return slot / stops;
}

function fromBar(day: DayKey, barProgress: number) {
  const lastDot = STOP_COUNTS[day] - 0.5;
  const slot = barProgress * STOP_COUNTS[day];
  const row = slot <= lastDot ? slot : lastDot + ((slot - lastDot) * (ROW_COUNTS[day] - lastDot)) / 0.5;
  return row / ROW_COUNTS[day];
}

/** Trailing gap that a day's slots run on through: all but the last day's. */
const trailOf = (day: DayKey) => (day === LAST_DAY ? 0 : GAP);

/** Sizes a day's segment to its slots less its trailing gap. */
const flexOf = (day: DayKey) => `0 0 calc(${(STOP_COUNTS[day] / TOTAL_STOPS) * 100}% - ${trailOf(day)}px)`;

/** A CSS length `barProgress` of the way through a segment's slots, trailing gap included. */
const along = (day: DayKey, barProgress: number | string) => `calc(${barProgress} * (100% + ${trailOf(day)}px))`;

/** Slots on the bar before each day's segment. */
const SLOTS_BEFORE = Object.fromEntries(
  DAY_KEYS.map((day, i) => [day, DAY_KEYS.slice(0, i).reduce((sum, d) => sum + STOP_COUNTS[d], 0)]),
) as Record<DayKey, number>;

/** Where a position through `day`'s rows falls on the bar, in slots from its start. */
const slotAt = (day: DayKey, rowProgress: number) => SLOTS_BEFORE[day] + toBar(day, rowProgress) * STOP_COUNTS[day];

/**
 * The thumb's position in slots, in CSS: `--at` is where React last put it, and `--swipe` (registered
 * in styles.css so it can animate) is how far a swipe has moved it from there.
 */
const POS = '(var(--at) + var(--swipe))';
const GLIDE_MS = 300;
const GLIDE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** The thumb's offset from `--at` as now on screen, mid-glide included. */
const offsetOf = (bar: HTMLElement) => Number.parseFloat(getComputedStyle(bar).getPropertyValue('--swipe')) || 0;

/** Eases the thumb from `from` slots off `--at` to rest there. */
function glide(bar: HTMLElement, from: number, duration: number, easing: string) {
  for (const animation of bar.getAnimations()) animation.cancel();
  bar.style.removeProperty('--swipe');
  if (!from || !duration || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  bar.animate({ '--swipe': [String(from), '0'] }, { duration, easing });
}

/** Lets a swipe between waypoints carry the thumb along with it. */
export interface ScrubberFollow {
  /** Moves the thumb `progress` of the way to the next waypoint, or the previous one if negative. */
  follow: (progress: number) => void;
  /** Eases the thumb from where it is to the current waypoint over `duration` ms. */
  settle: (duration: number, easing: string) => void;
}

const overnight = (day: DayKey) => {
  const towns = NIGHTS[day];
  return towns.find(isPrimary) ?? towns[0];
};

const dayOf = (sel: Selection) => (sel.kind === 'stop' ? sel.stop.day : sel.day);

/** Where `sel` sits among its day's rows, as the middle of its row. */
function positionOf(sel: Selection) {
  const day = dayOf(sel);
  const rows = ITINERARY.filter((s) => dayOf(s) === day);
  const index = Math.max(
    0,
    rows.findIndex((s) => isSameSelection(s, sel)),
  );
  return { day, progress: (index + 0.5) / rows.length, index, count: rows.length };
}

interface Props {
  /** The scrolling element that holds the day sections. */
  list: HTMLElement | null;
  routes: RouteResult[] | null;
  /** Pins the scrubber to the top of `list`, which it then sits inside. */
  sticky?: boolean;
  onPick?: (day: DayKey) => void;
  /** A stop shown in place of the list: the bar marks it, and the summary row leads back to the list. */
  current?: { selection: Selection; onBack: () => void };
  followRef?: Ref<ScrubberFollow>;
}

const slotOf = (sel: Selection) => {
  const { day, progress } = positionOf(sel);
  return slotAt(day, progress);
};

/** The current day, a bar to scrub through the whole trip, and the day's stop count and overnight. */
export function DayScrubber({ list, routes, sticky = false, onPick, current, followRef }: Props) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const segments = useRef<Partial<Record<DayKey, HTMLDivElement | null>>>({});
  const { position: scrolled, scrollToDay, scrubTo } = useDayScroll(list, sticky ? root : null);
  const shown = current && positionOf(current.selection);
  const { day, progress } = shown ?? scrolled;

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
  const at = slotAt(day, progress);
  const row = shown ? shown.index : Math.min(ROW_COUNTS[day] - 1, Math.floor(progress * ROW_COUNTS[day]));
  const onStop: NumberedStop | undefined = DAY_STOPS[day][row];
  const showingStop = !!current;

  // Moving between waypoints glides the thumb over from wherever it was; scrolling moves it directly.
  const lastAt = useRef(at);
  useLayoutEffect(() => {
    const was = lastAt.current;
    lastAt.current = at;
    const bar = barRef.current;
    if (was === at || !bar) return;
    glide(bar, showingStop ? was + offsetOf(bar) - at : 0, GLIDE_MS, GLIDE_EASE);
  }, [at, showingStop]);

  useImperativeHandle(followRef, () => ({
    follow: (progress) => {
      const bar = barRef.current;
      if (!bar || !current) return;
      const i = ITINERARY.findIndex((s) => isSameSelection(s, current.selection));
      const neighbor = ITINERARY[progress < 0 ? i - 1 : i + 1];
      for (const animation of bar.getAnimations()) animation.cancel();
      bar.style.setProperty('--swipe', String(neighbor ? Math.abs(progress) * (slotOf(neighbor) - at) : 0));
    },
    settle: (duration, easing) => {
      const bar = barRef.current;
      if (bar) glide(bar, offsetOf(bar), duration, easing);
    },
  }));

  const pick = (next: DayKey) => {
    onPick?.(next);
    requestAnimationFrame(() => scrollToDay(next));
  };

  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    const rects = DAY_KEYS.map((d) => segments.current[d]?.getBoundingClientRect());
    const i = rects.findIndex((r, j) => r && e.clientX < r.right + trailOf(DAY_KEYS[j]));
    const target = DAY_KEYS[i < 0 ? DAY_KEYS.length - 1 : i];
    const rect = rects[i < 0 ? DAY_KEYS.length - 1 : i];
    // Over a stop, the list is hidden; go back to it, at the touched day, and keep scrubbing there.
    if (current) {
      pick(target);
      return;
    }
    if (!rect) return;
    const barProgress = (e.clientX - rect.left) / (rect.width + trailOf(target));
    scrubTo(target, fromBar(target, Math.min(1, Math.max(0, barProgress))));
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
        aria-valuenow={Math.round((at / TOTAL_STOPS) * 100)}
        aria-valuetext={`${name}, ${Math.round(progress * 100)}% through the day`}
        data-base-ui-swipe-ignore="x"
        ref={barRef}
        className="relative flex cursor-pointer touch-pan-y gap-[3px] rounded-sm py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ '--at': at } as CSSProperties}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e);
        }}
        onKeyDown={onKeyDown}
      >
        {DAY_KEYS.map((d) => (
          <div
            key={d}
            ref={(el) => {
              segments.current[d] = el;
            }}
            className="relative h-1.5 rounded-full bg-[color-mix(in_srgb,var(--c)_22%,transparent)]"
            style={{ '--c': DAYS[d].hex, flex: flexOf(d) } as CSSProperties}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div
                className="h-full bg-(--c)"
                style={{
                  transform: `translateX(calc(${along(d, `clamp(0, (${POS} - ${SLOTS_BEFORE[d]}) / ${STOP_COUNTS[d]}, 1)`)} - 100%))`,
                }}
              />
            </div>
            {DAY_STOPS[d].map((stop, j) => {
              const dot = SLOTS_BEFORE[d] + j + 0.5;
              // Fully white once the thumb reaches the dot, and the day's tint before.
              const passed = `clamp(0, (${POS} - ${dot}) * 1000 + 1, 1)`;
              return (
                <div
                  key={stop.n}
                  className="pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: along(d, (j + 0.5) / STOP_COUNTS[d]),
                    background: `color-mix(in srgb, rgb(255 255 255 / 0.7) calc(${passed} * 100%), color-mix(in srgb, var(--c) 45%, transparent))`,
                  }}
                />
              );
            })}
          </div>
        ))}
        {/* Positioned with `left`: a full-width layer translated across would overflow the sheet sideways. */}
        <div
          className={cn(
            'pointer-events-none absolute top-1/2 grid size-3.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-(--c) bg-white text-[10px] leading-none font-bold text-(--c) tabular-nums shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[width,height] duration-150',
            onStop && 'size-5',
            onStop && !onStop.suggested && 'bg-(--c) text-white',
          )}
          style={{ '--c': DAYS[day].hex, left: `calc(${POS} / ${TOTAL_STOPS} * 100%)` } as CSSProperties}
        >
          {onStop?.n}
        </div>
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
            style={{ '--c': DAYS[d].hex, flex: flexOf(d) } as CSSProperties}
            aria-label={DAYS[d].name}
            aria-current={d === day || undefined}
            onClick={() => pick(d)}
          >
            {DAYS[d].name.slice(0, 3)}
          </button>
        ))}
      </div>

      {current && shown ? (
        <button
          type="button"
          className="mt-2 -mb-1.5 flex w-full items-center gap-1.5 rounded-sm border-t border-dashed pt-2 pb-1.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:animate-in motion-safe:fade-in"
          onClick={current.onBack}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} className="shrink-0" />
          <span className="font-semibold">Itinerary</span>
          <span className="ml-auto text-muted-foreground tabular-nums">
            {shown.index + 1} of {shown.count}
          </span>
        </button>
      ) : (
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
      )}
    </nav>
  );
}
