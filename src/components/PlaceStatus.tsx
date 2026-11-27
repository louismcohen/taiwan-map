import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { SavedPlace } from '../data/saved';
import { closesAtLabel, isOpen24Hours, isOpenNow, opensAtLabel, untilCloseLabel } from '../lib/hours';

/** Your Google Maps note in a quiet panel so it doesn't blend into chrome text. */
export function NoteBlock({
  children,
  className,
  clamp,
}: {
  children: ReactNode;
  className?: string;
  clamp?: boolean;
}) {
  return (
    <p
      className={cn(
        // Foreground tint darkens on both page background and accent/selected rows.
        'rounded-md bg-foreground/6 px-2 py-1.5 text-[12.5px] leading-[1.45] text-muted-foreground',
        clamp && 'line-clamp-2',
        className,
      )}
    >
      {children}
    </p>
  );
}

function placeOpenState(place: SavedPlace) {
  const alwaysOpen = isOpen24Hours(place.hourPeriods, place.hours);
  if (alwaysOpen || !place.hourPeriods?.length) return undefined;
  return isOpenNow(place.hourPeriods);
}

/**
 * List row: Open · Closes 9 PM, or Closed · Opens 11 AM (tomorrow / Fri when it isn't today).
 * 24h places stay quiet — there is no next change to show.
 */
export function PlaceStatusMeta({ place, className }: { place: SavedPlace; className?: string }) {
  const open = placeOpenState(place);
  const when =
    place.hourPeriods && open === true
      ? closesAtLabel(place.hourPeriods)
      : place.hourPeriods && open === false
        ? opensAtLabel(place.hourPeriods)
        : undefined;

  const parts: { key: string; node: ReactNode }[] = [];
  if (open === true) {
    parts.push({
      key: 'open',
      node: <span className="font-semibold text-[#2f6b3c]">Open</span>,
    });
  } else if (open === false) {
    parts.push({
      key: 'closed',
      node: <span className="font-semibold text-[#9a2f3f]">Closed</span>,
    });
  }
  if (when) parts.push({ key: 'when', node: when });
  if (place.cashOnly) {
    parts.push({
      key: 'cash',
      node: <span className="font-semibold text-[#a35a10]">Cash only</span>,
    });
  }

  if (!parts.length) return null;

  return (
    <p className={cn('text-[12.5px] leading-[1.45] text-muted-foreground', className)}>
      {parts.map((part, i) => (
        <Fragment key={part.key}>
          {i > 0 && ' · '}
          {part.node}
        </Fragment>
      ))}
    </p>
  );
}

/**
 * Compact chips for map cards — exceptions only:
 * - 24h places: no hours chips
 * - Closed: Closed
 * - Open: Until … (implies open)
 * - Cash: when true
 */
export function PlaceStatusChips({
  place,
  className,
  until = false,
}: {
  place: SavedPlace;
  className?: string;
  /** Map cards: show "Until …" while open instead of a bare Open chip. */
  until?: boolean;
}) {
  const open = placeOpenState(place);
  const untilText = until && open && place.hourPeriods ? untilCloseLabel(place.hourPeriods) : undefined;

  const showClosed = open === false;
  const showUntil = !!untilText;
  if (!showClosed && !showUntil && !place.cashOnly) return null;

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {showClosed && <StatusChip tone="closed">Closed</StatusChip>}
      {place.cashOnly && <StatusChip tone="cash">Cash</StatusChip>}
      {showUntil && <StatusChip>{untilText}</StatusChip>}
    </span>
  );
}

function StatusChip({ tone, children }: { tone?: 'open' | 'closed' | 'cash'; children: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] items-center rounded-full bg-secondary px-1.5 text-[10px] font-bold tracking-[0.02em] text-foreground uppercase',
        tone === 'open' && 'bg-[color-mix(in_srgb,#3d8b4f_16%,transparent)] text-[#2f6b3c]',
        tone === 'closed' && 'bg-[color-mix(in_srgb,#c73e52_14%,transparent)] text-[#9a2f3f]',
        tone === 'cash' && 'bg-[color-mix(in_srgb,#d97a1e_16%,transparent)] text-[#a35a10]',
      )}
    >
      {children}
    </span>
  );
}
