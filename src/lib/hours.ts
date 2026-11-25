import type { HourPeriod } from '../data/placeDetails';

/** Taiwan wall time for schedule checks; hours from Places are local to the place. */
export const PLACE_TZ = 'Asia/Taipei';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function wallClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  const weekday = get('weekday') ?? '';
  const day = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  return { day, hour, minute, weekday };
}

/** The Places weekdayDescriptions line for today in `timeZone`, if any. */
export function hoursForToday(weekdayDescriptions: string[], now = new Date(), timeZone = PLACE_TZ) {
  const { weekday } = wallClock(now, timeZone);
  if (!weekday) return undefined;
  return weekdayDescriptions.find((line) => line.startsWith(`${weekday}:`));
}

function minutesSinceSunday({ day, hour, minute }: { day: number; hour: number; minute: number }) {
  return day * 24 * 60 + hour * 60 + minute;
}

/** True when Places reports the place as open around the clock (no useful open/closed chip). */
export function isOpen24Hours(periods?: HourPeriod[], weekdayDescriptions?: string[]) {
  if (weekdayDescriptions?.length && weekdayDescriptions.every((line) => /open 24 hours/i.test(line))) {
    return true;
  }
  // Places often encodes 24h as a single midnight open with no close.
  return !!periods?.length && periods.every((p) => !p.close && p.open.hour === 0 && p.open.minute === 0);
}

/**
 * Whether the place is open at `now` in `timeZone`, from structured Places periods.
 * Overnight spans (close.day before or equal with earlier time) wrap across midnight.
 */
export function isOpenNow(periods: HourPeriod[], now = new Date(), timeZone = PLACE_TZ): boolean {
  return !!openPeriod(periods, now, timeZone);
}

/** The period that contains `now`, if the place is open. */
export function openPeriod(periods: HourPeriod[], now = new Date(), timeZone = PLACE_TZ) {
  if (!periods.length) return undefined;
  const { day, hour, minute } = wallClock(now, timeZone);
  if (day < 0 || Number.isNaN(hour) || Number.isNaN(minute)) return undefined;
  const nowMin = minutesSinceSunday({ day, hour, minute });
  const week = 7 * 24 * 60;

  for (const period of periods) {
    const start = minutesSinceSunday(period.open);
    if (!period.close) {
      // Places encodes 24h as a midnight open with no close; otherwise open that calendar day.
      if (period.open.hour === 0 && period.open.minute === 0) return period;
      if (day === period.open.day) return period;
      continue;
    }
    let end = minutesSinceSunday(period.close);
    if (end <= start) end += week;
    if (nowMin >= start && nowMin < end) return period;
    // Also check the previous week's copy of an overnight span that wraps past Sunday.
    if (nowMin + week >= start && nowMin + week < end) return period;
  }
  return undefined;
}

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/** e.g. "Until 2:00 PM" for the current open period; undefined if closed or 24h-open. */
export function untilCloseLabel(periods: HourPeriod[], now = new Date(), timeZone = PLACE_TZ) {
  const period = openPeriod(periods, now, timeZone);
  if (!period?.close) return undefined;
  // Format wall-clock hour/minute only — the Date's calendar day is irrelevant.
  return `Until ${timeFmt.format(new Date(2000, 0, 1, period.close.hour, period.close.minute))}`;
}

/** Today's hours text without the weekday prefix, for list row fallbacks. */
export function todayHoursShort(weekdayDescriptions: string[], now = new Date(), timeZone = PLACE_TZ) {
  const line = hoursForToday(weekdayDescriptions, now, timeZone);
  if (!line) return undefined;
  const i = line.indexOf(':');
  return i >= 0 ? line.slice(i + 1).trim() : line;
}
