import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';

export type Snap = 'peek' | 'half' | 'full';
export type SheetHeights = Record<Snap, number>;

const SNAPS: Snap[] = ['peek', 'half', 'full'];
/** Share of the full sheet height shown at the middle snap. */
const HALF_RATIO = 0.55;
const DRAG_SLOP = 6;
/** How far ahead (ms) the release velocity is projected when choosing where to settle. */
const FLING_MS = 180;

interface Props {
  snap: Snap;
  onSnapChange: (snap: Snap) => void;
  onHeightsChange: (heights: SheetHeights) => void;
  header: ReactNode;
  children: ReactNode;
}

interface Drag {
  startY: number;
  base: number;
  offset: number;
  lastY: number;
  lastT: number;
  velocity: number;
  inBody: boolean;
  mode: 'pending' | 'drag' | 'scroll';
}

const rubberBand = (v: number, min: number, max: number) =>
  v < min ? min + (v - min) * 0.3 : v > max ? max + (v - max) * 0.3 : v;

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
 * Panel sized by CSS to its fully expanded height, translated down so only `heights[snap]`
 * shows. The body scrolls only when fully expanded; otherwise any vertical drag moves the sheet.
 */
export function BottomSheet({ snap, onSnapChange, onHeightsChange, header, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ full: 0, head: 0, safeBottom: 0 });

  const { full } = size;
  const peek = Math.min(size.head + size.safeBottom, full);
  const half = Math.min(Math.max(Math.round(full * HALF_RATIO), peek), full);

  const latest = useRef({ snap, heights: { peek, half, full }, onSnapChange });
  useLayoutEffect(() => {
    latest.current = { snap, heights: { peek, half, full }, onSnapChange };
  });

  useLayoutEffect(() => {
    const sheet = sheetRef.current!;
    const head = headRef.current!;
    const measure = () =>
      setSize({
        full: sheet.offsetHeight,
        head: head.offsetHeight,
        safeBottom: parseFloat(getComputedStyle(sheet).paddingBottom) || 0,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    observer.observe(head);
    return () => observer.disconnect();
  }, []);

  // Skip the slide-in on first paint.
  useLayoutEffect(() => {
    const sheet = sheetRef.current!;
    sheet.classList.add('dragging');
    const id = requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.remove('dragging')));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    if (!full) return;
    const heights = { peek, half, full };
    sheetRef.current!.style.transform = `translateY(${full - heights[snap]}px)`;
    onHeightsChange(heights);
  }, [snap, peek, half, full, onHeightsChange]);

  useEffect(() => {
    const sheet = sheetRef.current!;
    const body = bodyRef.current!;
    let drag: Drag | null = null;

    const place = (offset: number) => {
      sheet.style.transform = `translateY(${offset}px)`;
    };

    const begin = (y: number, target: EventTarget | null) => {
      const base = new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42;
      drag = {
        startY: y, base, offset: base, lastY: y, lastT: performance.now(), velocity: 0,
        inBody: body.contains(target as Node), mode: 'pending',
      };
    };

    const move = (y: number) => {
      if (!drag || drag.mode === 'scroll') return false;
      const dy = y - drag.startY;
      if (drag.mode === 'pending') {
        if (Math.abs(dy) < DRAG_SLOP) return false;
        if (drag.inBody && latest.current.snap === 'full' && (body.scrollTop > 0 || dy < 0)) {
          drag.mode = 'scroll';
          return false;
        }
        drag.mode = 'drag';
        sheet.classList.add('dragging');
      }
      const now = performance.now();
      drag.velocity = (y - drag.lastY) / Math.max(1, now - drag.lastT);
      drag.lastY = y;
      drag.lastT = now;
      const { heights } = latest.current;
      drag.offset = rubberBand(drag.base + dy, 0, heights.full - heights.peek);
      place(drag.offset);
      return true;
    };

    const end = () => {
      const d = drag;
      drag = null;
      if (d?.mode !== 'drag') return;
      sheet.classList.remove('dragging');
      const { heights, snap, onSnapChange } = latest.current;
      const projected = heights.full - (d.offset + d.velocity * FLING_MS);
      const target = SNAPS.reduce((a, b) => (Math.abs(heights[b] - projected) < Math.abs(heights[a] - projected) ? b : a));
      place(heights.full - heights[target]);
      if (target !== snap) onSnapChange(target);
      swallowNextClick();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) begin(e.touches[0].clientY, e.target);
      else end();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && move(e.touches[0].clientY) && e.cancelable) e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (move(e.clientY)) e.preventDefault();
    };
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      end();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      begin(e.clientY, e.target);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp, { once: true });
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);
    sheet.addEventListener('pointerdown', onPointerDown);
    return () => {
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', end);
      sheet.removeEventListener('touchcancel', end);
      sheet.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const expandFromPeek = (e: MouseEvent) => {
    if (snap === 'peek' && !(e.target as Element).closest('button, a')) onSnapChange('half');
  };

  return (
    <div ref={sheetRef} className="sheet" data-snap={snap}>
      <div ref={headRef} className="sheet-head" onClick={expandFromPeek}>
        <button
          className="sheet-handle"
          aria-label={snap === 'peek' ? 'Expand itinerary' : 'Collapse itinerary'}
          onClick={() => onSnapChange(snap === 'peek' ? 'half' : 'peek')}
        />
        {header}
      </div>
      <div ref={bodyRef} className="sheet-body">{children}</div>
    </div>
  );
}
