import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { CSSProperties, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import { isSameSelection, type Selection } from '../data/derive';
import { CATEGORIES, CATEGORY_LABELS } from '../data/placeKinds';
import { SAVED_LIST } from '../data/places';
import { matchesFilter, NO_FILTER, REGION_LABELS, REGIONS, type SavedFilter, type SavedPlace } from '../data/saved';
import { useTrip } from '../data/TripContext';
import { CATEGORY_STYLE, placeColor, placeIcon } from '../lib/placeIcon';
import { overline, Row } from './DaySection';
import { PlaceStatusMeta } from './PlaceStatus';

export function SavedHeader({ hidden }: { hidden?: boolean }) {
  const { saved } = useTrip();
  return (
    <header
      hidden={hidden}
      className="border-b px-[22px] pt-6 pb-4 in-data-[slot=drawer-popup]:px-4 in-data-[slot=drawer-popup]:pt-2 in-data-[slot=drawer-popup]:pb-4"
    >
      <h1 className="mb-1 text-xl font-bold tracking-[-0.01em] in-data-[slot=drawer-popup]:text-[17px]">
        {SAVED_LIST.name}
      </h1>
      <p className="text-[13px] text-muted-foreground">
        {SAVED_LIST.owner}’s Google Maps list · {saved.length} places
      </p>
    </header>
  );
}

interface FilterProps {
  filter: SavedFilter;
  onChange: (filter: SavedFilter) => void;
}

export function SavedFilters({ filter, onChange }: FilterProps) {
  const { saved } = useTrip();
  const count = (f: SavedFilter) => saved.filter((p) => matchesFilter(p, f)).length;
  const categories = CATEGORIES.filter(
    (category) => category === filter.category || count({ ...filter, category }) > 0,
  );
  const regions = REGIONS.filter((region) => region === filter.region || count({ ...filter, region }) > 0);

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-1.5 border-b bg-background py-2.5">
      <ChipRow label="Category">
        <Chip active={filter.category === 'all'} onClick={() => onChange({ ...filter, category: 'all' })}>
          All
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category}
            active={filter.category === category}
            color={CATEGORY_STYLE[category].color}
            onClick={() =>
              onChange({
                ...filter,
                category: filter.category === category ? 'all' : category,
              })
            }
          >
            <HugeiconsIcon icon={CATEGORY_STYLE[category].icon} size={14} strokeWidth={2} className="shrink-0" />
            {CATEGORY_LABELS[category].short}
            <span className="font-medium opacity-60">{count({ ...filter, category })}</span>
          </Chip>
        ))}
      </ChipRow>
      <ChipRow label="Region">
        <Chip active={filter.region === 'all'} onClick={() => onChange({ ...filter, region: 'all' })}>
          Everywhere
        </Chip>
        {regions.map((region) => (
          <Chip
            key={region}
            active={filter.region === region}
            onClick={() =>
              onChange({
                ...filter,
                region: filter.region === region ? 'all' : region,
              })
            }
          >
            {REGION_LABELS[region]}
            <span className="font-medium opacity-60">{count({ ...filter, region })}</span>
          </Chip>
        ))}
      </ChipRow>
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and legend layout.
    <div
      role="group"
      aria-label={label}
      className="flex gap-1.5 overflow-x-auto px-[22px] [scrollbar-width:none] in-data-[slot=drawer-popup]:px-4"
    >
      {children}
    </div>
  );
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border bg-background px-3 text-[13px] font-semibold whitespace-nowrap text-(--c,inherit) transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        active && 'border-transparent bg-(--c,var(--foreground)) text-white hover:bg-(--c,var(--foreground))',
      )}
      style={color ? ({ '--c': color } as CSSProperties) : undefined}
    >
      {children}
    </button>
  );
}

interface ListProps extends FilterProps {
  ref?: Ref<HTMLDivElement>;
  places: SavedPlace[];
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  hidden?: boolean;
}

export function SavedList({ ref, places, selection, onSelect, filter, onChange, hidden }: ListProps) {
  return (
    <div ref={ref} hidden={hidden}>
      {places.length === 0 && (
        <div className="px-[22px] py-8 text-center text-[13px] text-muted-foreground in-data-[slot=drawer-popup]:px-4">
          No saved places match these filters.{' '}
          <button
            type="button"
            className="cursor-pointer font-semibold text-foreground underline"
            onClick={() => onChange(NO_FILTER)}
          >
            Show all
          </button>
        </div>
      )}
      {REGIONS.map((region) => {
        const inRegion = places.filter((p) => p.region === region);
        if (!inRegion.length) return null;
        return (
          <section
            key={region}
            className="px-[22px] pt-4 pb-1.5 in-data-[slot=drawer-popup]:px-4 in-data-[slot=drawer-popup]:pt-3.5"
          >
            {filter.region === 'all' && (
              <h2
                className={cn(
                  overline,
                  // Sit just under SavedFilters (py-2.5 + 2×h-8 + gap-1.5 = 5.625rem).
                  'sticky top-[5.625rem] z-[9] -mx-[22px] mb-1 bg-background px-[22px] py-1.5 font-bold tracking-[0.06em] in-data-[slot=drawer-popup]:-mx-4 in-data-[slot=drawer-popup]:px-4',
                )}
              >
                {REGION_LABELS[region]} · {inRegion.length}
              </h2>
            )}
            {inRegion.map((place) => (
              <Row
                key={place.id}
                active={isSameSelection(selection, {
                  kind: 'place',
                  place,
                })}
                onClick={() => onSelect({ kind: 'place', place })}
                icon={<PlaceThumb place={place} />}
                label={CATEGORY_LABELS[place.category].short}
                title={place.name}
                status={<PlaceStatusMeta place={place} />}
                note={place.note}
                body={place.note ? undefined : place.editorial}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

/** Photo thumb with category badge; falls back to the category icon when there is no photo. */
function PlaceThumb({ place }: { place: SavedPlace }) {
  const photo = place.photos?.[0];
  const badge = (
    <div
      className={cn(
        'grid place-items-center rounded-full bg-(--c) text-white',
        photo ? 'absolute -right-1 -bottom-1 size-[18px] shadow-[0_0_0_2px_var(--background)]' : 'size-[26px]',
      )}
      style={{ '--c': placeColor(place) } as CSSProperties}
    >
      <HugeiconsIcon icon={placeIcon(place)} size={photo ? 10 : 14} strokeWidth={2} />
    </div>
  );
  if (!photo) return badge;
  return (
    // Badge sits on the corner above the photo — keep overflow on the image only.
    <div className="relative size-11 shrink-0">
      <div className="size-full overflow-hidden rounded-md bg-muted">
        <img
          src={photo}
          alt=""
          // List thumbs sit in a scrollable sheet — keep them off the LCP path.
          loading="lazy"
          fetchPriority="low"
          className="size-full object-cover"
        />
      </div>
      {badge}
    </div>
  );
}

/** Heads a place's detail in the bottom sheet, where the list it came from is hidden. */
export function PlaceBackBar({ index, count, onBack }: { index: number; count: number; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 border-b bg-background px-4 pt-1 pb-2.5">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-1.5 rounded-sm text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onBack}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} className="shrink-0" />
        <span className="font-semibold">Saved places</span>
        {index >= 0 && (
          <span className="ml-auto text-muted-foreground tabular-nums">
            {index + 1} of {count}
          </span>
        )}
      </button>
    </div>
  );
}
