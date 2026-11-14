import { useEffect, useRef, useState } from 'react';
import { DAY_KEYS } from '../data/derive';
import type { DayKey } from '../data/trip';

/** Scroll-event silence in ms that marks a programmatic scroll as finished. */
const SETTLE_MS = 150;
/** Slack in px for landing a programmatic scroll exactly on a section's top. */
const SPY_SLACK = 1;

export interface DayPosition {
  day: DayKey;
  /** How far the reading line is through the day's section, 0–1. */
  progress: number;
}

const sectionOf = (day: DayKey) => document.getElementById(`day-${day}`);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * A day is current once its section's top crosses a reading line just below `header` (when it's
 * pinned inside `list`). Over the last screenful the line slides down to the list's bottom, so the
 * final days, which can't scroll up to the header, still progress smoothly to 100%.
 */
function measure(list: HTMLElement, header: HTMLElement | null) {
  const offset = header?.offsetHeight ?? 0;
  const max = list.scrollHeight - list.clientHeight;
  const slideFrom = max - (list.clientHeight - offset);
  const origin = list.getBoundingClientRect().top + list.clientTop - list.scrollTop;
  return {
    lineAt: (scroll: number) => scroll + offset + Math.max(0, scroll - slideFrom),
    scrollFor: (line: number) => {
      const s = line - offset;
      return clamp(s <= slideFrom ? s : (s + slideFrom) / 2, 0, max);
    },
    span: (day: DayKey) => {
      const rect = sectionOf(day)?.getBoundingClientRect();
      return rect && { top: rect.top - origin, height: rect.height };
    },
  };
}

/**
 * Tracks which day's section the scrolling `list` is in and how far through it, and scrolls to a
 * picked day or position. During a picked day's smooth scroll it stays current so the days passed
 * don't flash.
 */
export function useDayScroll(list: HTMLElement | null, header: HTMLElement | null = null) {
  const [position, setPosition] = useState<DayPosition>({ day: DAY_KEYS[0], progress: 0 });
  const heldUntil = useRef(0);

  useEffect(() => {
    if (!list) return;
    const update = () => {
      const now = performance.now();
      if (now < heldUntil.current) {
        heldUntil.current = now + SETTLE_MS;
        return;
      }
      const { lineAt, span } = measure(list, header);
      const line = lineAt(list.scrollTop);
      const day = DAY_KEYS.findLast((d) => (span(d)?.top ?? 0) <= line + SPY_SLACK) ?? DAY_KEYS[0];
      const s = span(day);
      const progress = s ? clamp((line - s.top) / s.height, 0, 1) : 0;
      setPosition((prev) =>
        prev.day === day && Math.abs(prev.progress - progress) < 0.001 ? prev : { day, progress },
      );
    };
    update();
    list.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    if (header) observer.observe(header);
    for (const day of DAY_KEYS) {
      const section = sectionOf(day);
      if (section) observer.observe(section);
    }
    return () => {
      list.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [list, header]);

  const scrollToDay = (day: DayKey) => {
    if (!list) return;
    const { scrollFor, span } = measure(list, header);
    const s = span(day);
    if (!s) return;
    setPosition({ day, progress: 0 });
    heldUntil.current = performance.now() + SETTLE_MS;
    list.scrollTo({ top: scrollFor(s.top), behavior: 'smooth' });
  };

  const scrubTo = (day: DayKey, progress: number) => {
    if (!list) return;
    const { scrollFor, span } = measure(list, header);
    const s = span(day);
    if (!s) return;
    heldUntil.current = 0;
    list.scrollTop = scrollFor(s.top + progress * s.height);
  };

  return { position, scrollToDay, scrubTo };
}
