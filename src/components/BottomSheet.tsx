import type { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export type Snap = 'peek' | 'half' | 'full';
export type SheetHeights = Record<Snap, number>;

/** Share of the full sheet height shown at the middle snap. */
const HALF_RATIO = 0.55;
/** Base UI treats 1 as the popup's full height and only marks that snap point `data-expanded`. */
const FULL = 1;
/**
 * Base UI damps drags past the top but lets the sheet follow the finger below `peek`, where it
 * would be dismissing. Resist there at 30% instead, since this sheet never closes.
 */
const RUBBER_BAND_Y =
  'calc(var(--drawer-snap-point-offset) + min(var(--drawer-swipe-movement-y), calc(var(--room) + (var(--drawer-swipe-movement-y) - var(--room)) * 0.3)))';
/** Finger travel in px below which a touch is still a tap. */
const TAP_SLOP = 10;

interface Props {
  snap: Snap;
  onSnapChange: (snap: Snap) => void;
  onHeightsChange: (heights: SheetHeights) => void;
  header: ReactNode;
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
 * Always-open, non-modal drawer that snaps between `peek` (just the header), `half` and `full`.
 * The body scrolls only when fully expanded; otherwise any vertical drag moves the sheet.
 */
export function BottomSheet({ snap, onSnapChange, onHeightsChange, header, children }: Props) {
  // The popup mounts through a portal, so it may not exist on the first layout pass.
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  const [head, setHead] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ full: 0, headBottom: 0, safeBottom: 0 });
  const [animated, setAnimated] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  const { full } = size;
  const peek = Math.min(size.headBottom + size.safeBottom, full);
  const half = Math.min(Math.max(Math.round(full * HALF_RATIO), peek), full);

  useLayoutEffect(() => {
    if (!popup || !head) return;
    const measure = () =>
      setSize({
        full: popup.offsetHeight,
        headBottom: popup.clientTop + head.offsetTop + head.offsetHeight,
        safeBottom: Number.parseFloat(getComputedStyle(popup).paddingBottom) || 0,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(popup);
    observer.observe(head);
    return () => observer.disconnect();
  }, [popup, head]);

  useLayoutEffect(() => {
    if (full) onHeightsChange({ peek, half, full });
  }, [peek, half, full, onHeightsChange]);

  // Until the first measurement the popup sits fully open; don't animate it down to `peek`.
  useLayoutEffect(() => {
    if (!full || animated) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    return () => cancelAnimationFrame(id);
  }, [full, animated]);

  const snapValue = (s: Snap) => (s === 'full' ? FULL : s === 'half' ? half : peek);

  const handleSnapPointChange = (
    value: DrawerPrimitive.Root.SnapPoint | null,
    details: DrawerPrimitive.Root.SnapPointChangeEventDetails,
  ) => {
    // On touch, Base UI starts a swipe even on buttons and reports every release, taps included.
    if (details.reason === 'swipe' && dragged.current) swallowNextClick();
    // `null` means a swipe past the lowest snap point, which would close the drawer.
    if (value === null) {
      details.cancel();
      if (snap !== 'peek') onSnapChange('peek');
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
    if (snap === 'peek' && !(e.target as Element).closest('button, a')) onSnapChange('half');
  };

  return (
    <Drawer
      open
      onOpenChange={(open, details) => {
        if (!open) details.cancel();
      }}
      modal={false}
      disablePointerDismissal
      snapPoints={full ? [peek, half, FULL] : undefined}
      snapPoint={full ? snapValue(snap) : null}
      onSnapPointChange={handleSnapPointChange}
    >
      {/* Fully expanded, the sheet leaves a strip of map showing below the status bar / Dynamic Island. */}
      <DrawerContent
        ref={setPopup}
        aria-label="Itinerary"
        initialFocus={false}
        onPointerDownCapture={trackPointerStart}
        onPointerMoveCapture={trackPointerMove}
        style={
          {
            '--room': `calc(${full - peek}px - var(--drawer-snap-point-offset))`,
            '--translate-y': RUBBER_BAND_Y,
          } as CSSProperties
        }
        className={cn(
          'h-[calc(100dvh-env(safe-area-inset-top)-56px)] max-h-none bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.12)] duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]',
          !animated && 'transition-none',
        )}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: tap-anywhere shortcut; the handle button is the keyboard control */}
        <div ref={setHead} className="shrink-0 border-b select-none" onClick={expandFromPeek}>
          <button
            type="button"
            className="block h-4 w-full cursor-grab before:mx-auto before:mt-1.5 before:block before:h-1 before:w-9 before:rounded-full before:bg-[#d6d1c7]"
            aria-label={snap === 'peek' ? 'Expand itinerary' : 'Collapse itinerary'}
            onClick={() => onSnapChange(snap === 'peek' ? 'half' : 'peek')}
          />
          {header}
        </div>
        <div className="min-h-0 flex-1 overflow-y-hidden overscroll-contain group-data-expanded/drawer-popup:overflow-y-auto">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
