import { useEffect, useRef, useState } from 'react';
import { DAY_KEYS } from '../data/derive';
import type { DayKey } from '../data/trip';

/** A day becomes current once its section's top is within this many px of the list's top. */
const SPY_OFFSET = 24;
/** Scroll-event silence in ms that marks a programmatic scroll as finished. */
const SETTLE_MS = 150;

const sectionOf = (day: DayKey) => document.getElementById(`day-${day}`);

/**
 * Tracks which day's section is at the top of the scrolling `list`, and smooth-scrolls it to a
 * picked day. During that scroll the picked day stays current so the days passed don't flash.
 */
export function useDayScroll(list: HTMLElement | null) {
  const [active, setActive] = useState<DayKey>(DAY_KEYS[0]);
  const heldUntil = useRef(0);

  useEffect(() => {
    if (!list) return;
    const onScroll = () => {
      const now = performance.now();
      if (now < heldUntil.current) {
        heldUntil.current = now + SETTLE_MS;
        return;
      }
      const top = list.getBoundingClientRect().top + SPY_OFFSET;
      setActive(DAY_KEYS.findLast((day) => (sectionOf(day)?.getBoundingClientRect().top ?? 0) <= top) ?? DAY_KEYS[0]);
    };
    list.addEventListener('scroll', onScroll, { passive: true });
    return () => list.removeEventListener('scroll', onScroll);
  }, [list]);

  const scrollToDay = (day: DayKey) => {
    const section = sectionOf(day);
    if (!list || !section) return;
    setActive(day);
    heldUntil.current = performance.now() + SETTLE_MS;
    list.scrollTo({
      top: list.scrollTop + section.getBoundingClientRect().top - list.getBoundingClientRect().top,
      behavior: 'smooth',
    });
  };

  return [active, scrollToDay] as const;
}
