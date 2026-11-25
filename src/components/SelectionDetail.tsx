import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Money04Icon,
  Route01Icon,
  Time04Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type MouseEvent, type PointerEvent, type RefObject, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSheetStretch } from '@/components/BottomSheet';
import type { ScrubberFollow } from '@/components/DayScrubber';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { describe, isSameSelection, type Selection } from '../data/derive';
import { nearestStop } from '../data/saved';
import { useTrip } from '../data/TripContext';
import { fmtDistance } from '../lib/format';
import { hoursForToday } from '../lib/hours';
import { NoteBlock } from './PlaceStatus';

interface Props {
  selection: Selection;
  /** What Previous and Next, and swipes, page through. */
  sequence: Selection[];
  onSelect: (selection: Selection) => void;
}

interface DetailProps extends Props {
  /** A scrubber whose thumb moves along with swipes. */
  scrubber?: RefObject<ScrubberFollow | null>;
}

/** Travel in px before a drag counts as horizontal; matches Base UI's drawer so the sheet and the swipe agree. */
const AXIS_SLOP = 6;
const AXIS_BIAS = 2;
/** Share of the width a slow drag must cross to change waypoints. */
const COMMIT_RATIO = 0.25;
/** Release speed in px/ms that changes waypoints however short the drag. */
const FLICK_SPEED = 0.4;
/** How much of the finger's travel the panel follows past the first or last waypoint. */
const RUBBER_BAND = 0.2;
const VELOCITY_WINDOW_MS = 80;
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
/** Starting slope of `EASE`, so a settle can begin at the speed the finger left at. */
const EASE_SLOPE = 0.72 / 0.32;
const MIN_SETTLE_MS = 200;
const MAX_SETTLE_MS = 450;
/** Saved places closer than this to a stop say so. */
const NEAR_ROUTE_KM = 5;

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  /** Where the panel was when the finger landed, if it caught a settle mid-flight. */
  base: number;
  x: number;
  horizontal: boolean;
  samples: { x: number; t: number }[];
}

export function SelectionDetail({ selection, sequence, onSelect, scrubber }: DetailProps) {
  const i = sequence.findIndex((s) => isSameSelection(s, selection));
  const prev = sequence[i - 1];
  const next = sequence[i + 1];
  const trackRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const settling = useRef<Animation | null>(null);
  const swiped = useRef(false);
  const sheet = useSheetStretch();

  const moveTo = (track: HTMLElement, x: number) => {
    track.style.transform = x ? `translateX(${x}px)` : '';
  };

  /** Sizes the sheet between this panel's height and the neighbor's, by how far the neighbor has slid in. */
  const stretchTo = (track: HTMLElement, x: number) => {
    if (!sheet) return;
    const main = track.querySelector<HTMLElement>(':scope > :not([inert])');
    const neighbor = x < 0 ? next && track.lastElementChild : prev && track.firstElementChild;
    if (!main || !(neighbor instanceof HTMLElement)) {
      sheet.stretch(0);
      return;
    }
    const progress = Math.min(Math.abs(x) / main.offsetWidth, 1);
    sheet.stretch((neighbor.offsetHeight - main.offsetHeight) * progress);
  };

  /** Eases the panel from `from` back to rest, starting at `velocity` (px/ms), and the sheet's height with it. */
  const settle = (track: HTMLElement, from: number, velocity: number, entering: boolean) => {
    moveTo(track, 0);
    if (!from) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (entering) settling.current = track.animate({ opacity: [0, 1] }, { duration: 150, easing: 'ease-out' });
      sheet?.settle(0, EASE);
      scrubber?.current?.settle(0, EASE);
      return;
    }
    const speed = Math.max(-velocity * Math.sign(from), FLICK_SPEED);
    const duration = Math.min(Math.max((EASE_SLOPE * Math.abs(from)) / speed, MIN_SETTLE_MS), MAX_SETTLE_MS);
    settling.current = track.animate({ transform: [`translateX(${from}px)`, 'none'] }, { duration, easing: EASE });
    sheet?.settle(duration, EASE);
    scrubber?.current?.settle(duration, EASE);
  };

  const startGesture = (e: PointerEvent<HTMLDivElement>) => {
    swiped.current = false;
    const track = trackRef.current;
    if (!track || !e.isPrimary || e.button !== 0) return;
    const strip = (e.target as Element).closest('[data-photos]');
    if (strip && strip.scrollWidth > strip.clientWidth) return;
    const base = settling.current?.playState === 'running' ? new DOMMatrix(getComputedStyle(track).transform).m41 : 0;
    settling.current?.cancel();
    moveTo(track, base);
    if (base) scrubber?.current?.follow(-base / e.currentTarget.offsetWidth);
    gesture.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      base,
      x: base,
      horizontal: false,
      samples: [],
    };
  };

  const endGesture = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const track = trackRef.current;
    if (!g || g.pointerId !== e.pointerId || !track) return;
    gesture.current = null;
    if (!g.horizontal) {
      settle(track, g.x, 0, false);
      return;
    }
    swiped.current = true;
    const recent = g.samples.filter((s) => e.timeStamp - s.t <= VELOCITY_WINDOW_MS);
    const first = recent[0];
    const last = recent.at(-1);
    const velocity = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const target = g.x < 0 ? next : prev;
    const towardTarget = velocity * Math.sign(g.x);
    const commit =
      target &&
      e.type !== 'pointercancel' &&
      (towardTarget > FLICK_SPEED ||
        (Math.abs(g.x) > e.currentTarget.offsetWidth * COMMIT_RATIO && towardTarget > -FLICK_SPEED));
    if (!commit) {
      settle(track, g.x, velocity, false);
      return;
    }
    // Render the neighbor in the middle now, then carry on from where it was on screen.
    flushSync(() => onSelect(target));
    settle(track, g.x - Math.sign(g.x) * e.currentTarget.offsetWidth, velocity, true);
  };

  const trackGesture = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const track = trackRef.current;
    if (!g || g.pointerId !== e.pointerId || !track) return;
    const dx = e.clientX - g.startX;
    if (!g.horizontal) {
      const dy = e.clientY - g.startY;
      if (Math.abs(dx) >= AXIS_SLOP && Math.abs(dx) > Math.abs(dy) + AXIS_BIAS) {
        g.horizontal = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        // Vertical drags belong to the sheet.
        if (Math.abs(dy) >= AXIS_SLOP) endGesture(e);
        return;
      }
    }
    g.samples = [...g.samples.filter((s) => e.timeStamp - s.t <= VELOCITY_WINDOW_MS), { x: e.clientX, t: e.timeStamp }];
    const x = g.base + dx;
    g.x = (x > 0 ? prev : next) ? x : x * RUBBER_BAND;
    moveTo(track, g.x);
    stretchTo(track, g.x);
    scrubber?.current?.follow(-g.x / e.currentTarget.offsetWidth);
  };

  // A mouse drag ends in a click on whatever is under the pointer.
  const swallowSwipeClick = (e: MouseEvent) => {
    if (!swiped.current) return;
    swiped.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    // `x` hands horizontal touch drags here and leaves vertical ones to the sheet.
    // biome-ignore lint/a11y/noStaticElementInteractions: Prev and Next are the accessible way to page.
    <div
      data-base-ui-swipe-ignore="x"
      className="touch-pan-y overflow-clip"
      onPointerDown={startGesture}
      onPointerMove={trackGesture}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onClickCapture={swallowSwipeClick}
      onDragStart={(e) => e.preventDefault()}
    >
      <div ref={trackRef} className="relative">
        {prev && (
          <Panel selection={prev} sequence={sequence} onSelect={onSelect} className="absolute top-0 right-full" inert />
        )}
        <Panel selection={selection} sequence={sequence} onSelect={onSelect} />
        {next && (
          <Panel selection={next} sequence={sequence} onSelect={onSelect} className="absolute top-0 left-full" inert />
        )}
      </div>
    </div>
  );
}

function PagingButtons({ selection, sequence, onSelect }: Props) {
  const i = sequence.findIndex((s) => isSameSelection(s, selection));
  const prev = sequence[i - 1];
  const next = sequence[i + 1];
  const noun = selection.kind === 'place' ? 'place' : 'stop';
  return (
    <>
      <Button
        variant="secondary"
        size="icon-xs"
        className="rounded-full text-muted-foreground"
        aria-label={`Previous ${noun}`}
        disabled={!prev}
        onClick={() => prev && onSelect(prev)}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} />
      </Button>
      <Button
        variant="secondary"
        size="icon-xs"
        className="rounded-full text-muted-foreground"
        aria-label={`Next ${noun}`}
        disabled={!next}
        onClick={() => next && onSelect(next)}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} />
      </Button>
    </>
  );
}

function Panel({ selection, sequence, onSelect, className, inert }: Props & { className?: string; inert?: boolean }) {
  const { days, stops } = useTrip();
  const { color, label, title, subtitle, body, href, photos, website, hours, editorial, reviewSummary, cashOnly } =
    describe(selection, days);
  const near = selection.kind === 'place' ? nearestStop(selection.place, stops) : null;
  const todayHours = hours?.length ? hoursForToday(hours) : undefined;

  return (
    <div className={cn('w-full px-4 pt-1.5 pb-3', className)} inert={inert}>
      <div className="pb-3">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 text-[11px] font-semibold tracking-[0.05em] uppercase" style={{ color }}>
            {label}
          </div>
          <PagingButtons selection={selection} sequence={sequence} onSelect={onSelect} />
        </div>
        <h3 className="mt-0.5 text-[17px] leading-[1.3] font-bold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {selection.kind === 'place' && body ? (
        <NoteBlock className="mb-3 text-[13px] whitespace-pre-line">{body}</NoteBlock>
      ) : (
        body && <p className="mb-3 text-[13px] leading-[1.45] whitespace-pre-line text-muted-foreground">{body}</p>
      )}
      {editorial && <p className="mb-3 text-[13px] leading-[1.45] text-muted-foreground">{editorial}</p>}
      {reviewSummary && <p className="mb-3 text-[13px] leading-[1.45] text-muted-foreground">{reviewSummary}</p>}
      {(cashOnly || hours?.length) && (
        <div className="mb-3 space-y-1.5 text-xs leading-[1.45] text-muted-foreground">
          {cashOnly && (
            <p className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Money04Icon} size={14} strokeWidth={2} className="shrink-0" />
              <span className="font-semibold text-foreground">Cash only</span>
            </p>
          )}
          {hours?.length && (
            <div className="flex items-start gap-1.5">
              <HugeiconsIcon icon={Time04Icon} size={14} strokeWidth={2} className="mt-px shrink-0" />
              <ul className="space-y-0.5">
                {hours.map((line) => (
                  <li key={line} className={line === todayHours ? 'font-semibold text-foreground' : undefined}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {near && near.km < NEAR_ROUTE_KM && (
        <p className="mb-3 flex items-start gap-1.5 text-xs leading-[1.45] text-muted-foreground">
          <HugeiconsIcon icon={Route01Icon} size={14} strokeWidth={2} className="mt-px shrink-0" />
          <span>
            {fmtDistance(near.km)} from stop {near.stop.n},{' '}
            <span className="font-semibold text-foreground">{near.stop.name}</span> ({days[near.stop.day].name})
          </span>
        </p>
      )}
      {photos.length > 0 && (
        <div
          data-photos
          className="-mx-4 mb-3 flex snap-x snap-mandatory scroll-px-4 gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]"
        >
          {photos.map((photo, i) => (
            <a key={photo} href={photo} target="_blank" rel="noopener noreferrer" className="shrink-0 snap-start">
              <img
                src={photo}
                alt={`${title} (${i + 1} of ${photos.length})`}
                draggable={false}
                // Sheet/carousel images are revealed after interaction — keep them off the LCP path.
                fetchPriority="low"
                loading="lazy"
                className="h-32 w-44 rounded-md bg-muted object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {(href || website) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {href && (
            <a
              className="inline-flex items-center gap-0.5 text-[13px] font-semibold underline"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Maps
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={2} />
            </a>
          )}
          {website && (
            <a
              className="inline-flex items-center gap-0.5 text-[13px] font-semibold underline"
              href={website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Website
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={2} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
