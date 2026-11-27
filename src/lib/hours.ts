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

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEK_MIN = 7 * 24 * 60;
const DAY_MIN = 24 * 60;

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const hourFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric' });

/** On-the-hour times drop the minutes ("9 PM"); otherwise "4:30 PM". */
function formatWallTime(hour: number, minute: number) {
  const date = new Date(2000, 0, 1, hour, minute);
  return minute === 0 ? hourFmt.format(date) : timeFmt.format(date);
}

/** e.g. "Until 9 PM" for the current open period; undefined if closed or 24h-open. */
export function untilCloseLabel(periods: HourPeriod[], now = new Date(), timeZone = PLACE_TZ) {
  const period = openPeriod(periods, now, timeZone);
  if (!period?.close) return undefined;
  return `Until ${formatWallTime(period.close.hour, period.close.minute)}`;
}

/** "Closes 9 PM" while `now` falls in an open period that has a close. */
export function closesAtLabel(periods: HourPeriod[], now = new Date(), timeZone = PLACE_TZ) {
  const period = openPeriod(periods, now, timeZone);
  if (!period?.close) return undefined;
  return `Closes ${formatWallTime(period.close.hour, period.close.minute)}`;
}

/** Soonest opening strictly after `now`, wrapping into the following week. */
function nextOpening(periods: HourPeriod[], now: Date, timeZone: string) {
  const clock = wallClock(now, timeZone);
  if (clock.day < 0 || Number.isNaN(clock.hour) || Number.isNaN(clock.minute) || !periods.length) return undefined;
  const nowMin = minutesSinceSunday(clock);
  let bestAt = Infinity;
  let best: HourPeriod['open'] | undefined;
  for (const period of periods) {
    let at = minutesSinceSunday(period.open);
    if (at <= nowMin) at += WEEK_MIN;
    if (at < bestAt) {
      bestAt = at;
      best = period.open;
    }
  }
  if (!best) return undefined;
  return { point: best, at: bestAt, nowMin, today: clock.day };
}

/**
 * When the place is closed: "Opens 4:30 PM" later today, "Opens 11 AM tomorrow",
 * or "Opens 11 AM Fri" further out. Weekday is the place's, not the viewer's.
 */
export function opensAtLabel(periods: HourPeriod[], now = new Date(), timeZone = PLACE_TZ) {
  const next = nextOpening(periods, now, timeZone);
  if (!next) return undefined;
  const time = formatWallTime(next.point.hour, next.point.minute);
  const { day } = next.point;
  if (day === next.today && next.at - next.nowMin < DAY_MIN) return `Opens ${time}`;
  if (day === (next.today + 1) % 7) return `Opens ${time} tomorrow`;
  if (day === next.today) return `Opens ${time} next ${WEEKDAY_SHORT[day]}`;
  return `Opens ${time} ${WEEKDAY_SHORT[day]}`;
}
