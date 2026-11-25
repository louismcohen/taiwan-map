import type { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import {
  type CSSProperties,
  createContext,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export type Snap = 'peek' | 'half' | 'full';
/** `mid` is half the screen; `max` is as tall as a `fit` sheet currently gets. */
export type DetailRest = 'mid' | 'max';
/** Visible height at each stop, `mid` (half the screen), and `fit`, the content's height. */
export type SheetHeights = Record<Snap | 'fit' | 'mid', number>;

/** Lets content of a `fit` sheet resize it in step with its own animations. */
export interface SheetStretch {
  /** Sizes the sheet for `px` more content (less if negative) at once, e.g. to follow a swipe. */
  stretch: (px: number) => void;
  /** Measures the content now, then eases from the current height to fit it over `duration` ms. */
  settle: (duration: number, easing: string) => void;
}

const SheetStretchContext = createContext<SheetStretch | null>(null);

/** `null` outside a `fit` sheet. */
export const useSheetStretch = () => useContext(SheetStretchContext);

interface Size {
  full: number;
  headBottom: number;
  peekTop: number;
  contentHeight: number;
  safeBottom: number;
  viewport: number;
}

const fitHeightOf = (s: Size, extra = 0) =>
  Math.min(Math.max(s.headBottom + s.contentHeight + extra + s.safeBottom, 0), s.full);

/** Share of the full sheet height shown at the middle snap. */
const HALF_RATIO = 0.55;
/**
 * Half the screen, where a selected pin's sheet opens. At most 1, so Base UI reads it as a share of
 * the viewport rather than a pixel height.
 */
const MID_SCREEN = 0.5;
/** Base UI treats 1 as the popup's full height and only marks that snap point `data-expanded`. */
const FULL = 1;
/**
 * Base UI damps drags past the top but lets the sheet follow the finger below `peek`, where it
 * would be dismissing. Resist there at 30% instead, since this sheet never closes.
 */
const RUBBER_BAND_Y =
  'calc(var(--drawer-snap-point-offset) + min(var(--drawer-swipe-movement-y), calc(var(--room) + (var(--drawer-swipe-movement-y) - var(--room)) * 0.3)))';
/** A dismissable sheet follows the finger below `peek`. */
const FOLLOW_Y = 'calc(var(--drawer-snap-point-offset) + var(--drawer-swipe-movement-y) - var(--stretch, 0px))';
/** Finger travel in px below which a touch is still a tap. */
const TAP_SLOP = 10;

interface Props {
  snap: Snap;
  onSnapChange: (snap: Snap) => void;
  onHeightsChange: (heights: SheetHeights) => void;
  /** Makes the content's height, up to the usual height, the only stop. */
  fit?: boolean;
  /** Called on a swipe down past `peek` or Escape; without it, the sheet resists there instead. */
  onDismiss?: () => void;
  /** Where a `fit` sheet rests: half the screen, or the tallest it currently grows. */
  rest?: DetailRest;
  onRestChange?: (rest: DetailRest) => void;
  /** An element in `children` whose top marks where `peek` ends; without it, `peek` shows just the handle. */
  peekTo?: HTMLElement | null;
  /** The scrolling element that holds `children`. */
  bodyRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

// A drag that ends over a row would otherwise select it.
function swallowNextClick() {
  const stop = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);
}

/**
 * Always-open, non-modal drawer that snaps between `peek` (the handle, down to `peekTo`), `half` and `full`.
 * A `fit` sheet opens at half the screen and can be dragged up to its current height, then back.
 * The body scrolls only when fully expanded; otherwise any vertical drag moves the sheet.
 */
export function BottomSheet({
  snap,
  onSnapChange,
  onHeightsChange,
  fit = false,
  onDismiss,
  rest = 'mid',
  onRestChange,
  peekTo,
  bodyRef,
  children,
}: Props) {
  // The popup mounts through a portal, so it may not exist on the first layout pass.
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  const [head, setHead] = useState<HTMLDivElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({
    full: 0,
    headBottom: 0,
    peekTop: 0,
    contentHeight: 0,
    safeBottom: 0,
    viewport: 0,
  });
  const [animated, setAnimated] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const readSize = useRef<(() => Size) | null>(null);

  const { full, headBottom, safeBottom } = size;
  const peek = Math.min(headBottom + size.peekTop + safeBottom, full);
  const half = Math.min(Math.max(Math.round(full * HALF_RATIO), peek), full);
  const mid = Math.min(full, Math.round(size.viewport * MID_SCREEN));
  const fitHeight = fitHeightOf(size);
  // Taller than half the screen, so the sheet can still be dragged up to the height it already had.
  const expandable = fit && mid > 0 && fitHeight > mid + 1;
  const hugContent = fit && (!expandable || rest === 'max');

  useLayoutEffect(() => {
    if (!popup || !head || !content) return;
    // `peekTo.offsetTop` is relative to the positioned body, so it ignores how far the body is scrolled.
    const read = () => ({
      full: popup.offsetHeight,
      headBottom: popup.clientTop + head.offsetTop + head.offsetHeight,
      peekTop: peekTo?.offsetTop ?? 0,
      contentHeight: content.offsetHeight,
      safeBottom: Number.parseFloat(getComputedStyle(popup).paddingBottom) || 0,
      viewport: popup.parentElement?.offsetHeight || popup.ownerDocument.documentElement.clientHeight,
    });
    readSize.current = read;
    const measure = () => setSize(read());
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(popup);
    observer.observe(head);
    observer.observe(content);
    if (popup.parentElement) observer.observe(popup.parentElement);
    for (let el = peekTo?.previousElementSibling; el; el = el.previousElementSibling) observer.observe(el);
    return () => {
      observer.disconnect();
      readSize.current = null;
    };
  }, [popup, head, content, peekTo]);

  // Written straight to the popup so following a finger doesn't re-render the sheet.
  const stretch = useMemo<SheetStretch | null>(() => {
    if (!hugContent || !popup) return null;
    let timer = 0;
    const transition = (duration: string, easing = '') => {
      popup.style.transitionDuration = duration;
      popup.style.transitionTimingFunction = easing;
    };
    return {
      stretch: (px) => {
        clearTimeout(timer);
        const s = sizeRef.current;
        transition('0s');
        popup.style.setProperty('--stretch', `${fitHeightOf(s, px) - fitHeightOf(s)}px`);
      },
      settle: (duration, easing) => {
        clearTimeout(timer);
        // The snap point must move to the new content in the same frame the stretch goes, or the height jumps.
        const next = readSize.current?.();
        if (next) flushSync(() => setSize(next));
        transition(`${duration}ms`, easing);
        popup.style.setProperty('--stretch', '0px');
        timer = window.setTimeout(() => transition(''), duration);
      },
    };
  }, [hugContent, popup]);

  useLayoutEffect(() => {
    if (!stretch || !popup) return;
    return () => {
      popup.style.removeProperty('--stretch');
      popup.style.transitionDuration = '';
      popup.style.transitionTimingFunction = '';
    };
  }, [stretch, popup]);

  useLayoutEffect(() => {
    if (full) onHeightsChange({ peek, half, full, fit: fitHeight, mid });
  }, [peek, half, full, fitHeight, mid, onHeightsChange]);

  // Until the first measurement the popup sits fully open; don't animate it down to `peek`.
  useLayoutEffect(() => {
    if (!full || animated) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    return () => cancelAnimationFrame(id);
  }, [full, animated]);

  // Content as tall as the sheet counts as fully expanded, which is what lets the body scroll.
  const maxPoint = fitHeight >= full - 1 ? FULL : fitHeight;
  const fitPoints = expandable ? [MID_SCREEN, maxPoint] : [maxPoint];
  const fitPoint = expandable && rest === 'mid' ? MID_SCREEN : maxPoint;
  const snapPoints = fit ? fitPoints : [peek, half, FULL];
  const activePoint = fit ? fitPoint : snap === 'full' ? FULL : snap === 'half' ? half : peek;

  const handleSnapPointChange = (
    value: DrawerPrimitive.Root.SnapPoint | null,
    details: DrawerPrimitive.Root.SnapPointChangeEventDetails,
  ) => {
    // On touch, Base UI starts a swipe even on buttons and reports every release, taps included.
    if (details.reason === 'swipe' && dragged.current) swallowNextClick();
    // `null` means a swipe past the lowest snap point, which would close the drawer.
    if (value === null) {
      details.cancel();
      if (onDismiss) onDismiss();
      else if (snap !== 'peek') onSnapChange('peek');
      return;
    }
    if (fit) {
      // One stop means the content is already under half the screen; dragging it doesn't pick a new rest.
      if (!expandable) return;
      const next = value === MID_SCREEN ? 'mid' : 'max';
      if (next !== rest) onRestChange?.(next);
      return;
    }
    const next: Snap = value === FULL ? 'full' : value === peek ? 'peek' : 'half';
    if (next !== snap) onSnapChange(next);
  };

  const trackPointerStart = (e: PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    dragged.current = false;
  };

  const trackPointerMove = (e: PointerEvent) => {
    const start = pointerStart.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP) dragged.current = true;
  };

  const expandFromPeek = (e: MouseEvent) => {
    if (!fit && snap === 'peek' && !(e.target as Element).closest('button, a')) onSnapChange('half');
  };

  return (
    <Drawer
      open
      onOpenChange={(open, details) => {
        if (open) return;
        details.cancel();
        if (details.reason === 'escape-key') onDismiss?.();
      }}
      modal={false}
      disablePointerDismissal
      snapPoints={full ? snapPoints : undefined}
      snapPoint={full ? activePoint : null}
      snapToSequentialPoints={expandable}
      onSnapPointChange={handleSnapPointChange}
    >
      {/* Fully expanded, the sheet leaves a strip of map showing below the status bar / Dynamic Island. */}
      <DrawerContent
        ref={setPopup}
        aria-label="Itinerary"
        initialFocus={false}
        onPointerDownCapture={trackPointerStart}
        onPointerMoveCapture={trackPointerMove}
        onClick={expandFromPeek}
        style={
          {
            '--room': `calc(${full - peek}px - var(--drawer-snap-point-offset))`,
            '--translate-y': onDismiss ? FOLLOW_Y : RUBBER_BAND_Y,
          } as CSSProperties
        }
        className={cn(
          'h-[calc(100dvh-env(safe-area-inset-top)-56px)] max-h-none bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.12)] duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]',
          !animated && 'transition-none',
        )}
      >
        <div ref={setHead} className="shrink-0 select-none">
          <button
            type="button"
            className="block h-6 w-full cursor-grab before:mx-auto before:mt-2.5 before:block before:h-1 before:w-9 before:rounded-full before:bg-[#d6d1c7]"
            aria-label={fit ? 'Back to itinerary' : snap === 'peek' ? 'Expand itinerary' : 'Collapse itinerary'}
            onClick={() => (fit ? onDismiss?.() : onSnapChange(snap === 'peek' ? 'half' : 'peek'))}
          />
        </div>
        <div
          ref={bodyRef}
          className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-hidden overscroll-contain group-data-expanded/drawer-popup:overflow-y-auto"
        >
          <div ref={setContent}>
            <SheetStretchContext value={stretch}>{children}</SheetStretchContext>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
