import {
  ArrowLeft01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  DoorClosedIcon,
  DoorOpenIcon,
  Search01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { type CSSProperties, type ReactNode, type Ref, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isSameSelection, type Selection } from '../data/derive';
import { CATEGORIES, CATEGORY_LABELS } from '../data/placeKinds';
import { SAVED_LIST } from '../data/places';
import {
  cycleTriFilter,
  matchesFilter,
  NO_FILTER,
  REGION_LABELS,
  REGIONS,
  type SavedFilter,
  type SavedPlace,
  type TriFilter,
} from '../data/saved';
import { useTrip } from '../data/TripContext';
import { usePlaceVisited } from '../data/visited';
import { CATEGORY_STYLE, placeColor, placeIcon } from '../lib/placeIcon';
import { overline, Row } from './DaySection';
import { PlaceStatusMeta } from './PlaceStatus';

/** SavedFilters sticky height: py-2.5 + 2×h-8 + gap-1.5. */
const FILTERS_STICKY_TOP = 'top-[5.625rem]';

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

const FIELD_SHADOW = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.18)]';

/** Map-top search between the mode menu and fit/locate FABs. */
export function SavedSearch({ filter, onChange }: FilterProps) {
  const query = filter.query;
  const rootRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const statusId = useId();
  const status = filterStatus(filter);
  const trailing = (filter.open === 'off' ? 0 : 1) + (filter.visited === 'off' ? 0 : 1) + (query ? 1 : 0);

  // Stay open across clicks on the filter buttons (those blur the field). A map press or Escape closes it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      if (rootRef.current?.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
      event.stopPropagation();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  return (
    <search
      ref={rootRef}
      className="pointer-events-auto relative min-w-0 flex-1 min-[761px]:max-w-[240px] min-[761px]:flex-none"
    >
      <label htmlFor="saved-search" className="sr-only">
        Search saved places
      </label>
      <div className="relative flex h-[38px] items-center">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute left-2.5 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="saved-search"
          type="search"
          value={query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
          onFocus={() => setOpen(true)}
          placeholder="Search places"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={status ? statusId : undefined}
          style={{ paddingRight: trailing === 0 ? 12 : 8 + trailing * 26 }}
          className={cn(
            'h-full w-full rounded-full bg-white py-0 pl-9 text-[13px] font-medium text-foreground outline-none ring-0 transition-[box-shadow] duration-150 ease-out placeholder:font-normal placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [&::-webkit-search-cancel-button]:hidden',
            FIELD_SHADOW,
            open && 'ring-2 ring-ring',
          )}
        />
        <div className="absolute right-1.5 flex items-center">
          {filter.open !== 'off' && (
            <FilterMark
              icon={filter.open === 'no' ? DoorClosedIcon : DoorOpenIcon}
              className={filter.open === 'no' ? 'text-[#9a2f3f]' : 'text-[#2f6b3c]'}
            />
          )}
          {filter.visited !== 'off' && (
            <FilterMark
              icon={filter.visited === 'no' ? CheckmarkCircle01Icon : Tick02Icon}
              className={filter.visited === 'no' ? 'text-foreground' : 'text-[#2f6b3c]'}
            />
          )}
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange({ ...filter, query: '' })}
              className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {status && (
        <p id={statusId} className="sr-only">
          Filtered by {status}
        </p>
      )}
      <fieldset
        inert={!open}
        aria-hidden={!open}
        className={cn(
          'absolute top-full left-0 z-20 mt-2 flex w-max min-w-0 gap-1.5 border-0 p-0 transition-[opacity,translate] duration-(--duration-filter) ease-(--ease-out) motion-reduce:transition-none max-[380px]:right-0 max-[380px]:left-auto',
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
        )}
      >
        <legend className="sr-only">Place filters</legend>
        <TriFilterButton
          label={filter.open === 'no' ? 'Closed now' : 'Open now'}
          mode={filter.open}
          icon={filter.open === 'no' ? DoorClosedIcon : DoorOpenIcon}
          tone={filter.open === 'no' ? 'closed' : 'open'}
          onClick={() => onChange({ ...filter, open: cycleTriFilter(filter.open) })}
        />
        <TriFilterButton
          label={filter.visited === 'no' ? 'Not visited' : 'Visited'}
          mode={filter.visited}
          icon={filter.visited === 'no' ? CheckmarkCircle01Icon : Tick02Icon}
          tone="visited"
          onClick={() => onChange({ ...filter, visited: cycleTriFilter(filter.visited) })}
        />
      </fieldset>
    </search>
  );
}

function filterStatus(filter: SavedFilter) {
  const parts: string[] = [];
  if (filter.open === 'yes') parts.push('open now');
  if (filter.open === 'no') parts.push('closed now');
  if (filter.visited === 'yes') parts.push('visited');
  if (filter.visited === 'no') parts.push('not visited');
  return parts.join(', ');
}

function FilterMark({ icon, className }: { icon: IconSvgElement; className: string }) {
  return (
    <span className={cn('grid size-6 place-items-center', className)} aria-hidden="true">
      <HugeiconsIcon icon={icon} size={15} strokeWidth={2} />
    </span>
  );
}

function TriFilterButton({
  label,
  mode,
  icon,
  tone,
  onClick,
}: {
  label: string;
  mode: TriFilter;
  icon: IconSvgElement;
  tone: 'open' | 'closed' | 'visited';
  onClick: () => void;
}) {
  const pressed = mode !== 'off';
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold whitespace-nowrap transition-[color,background-color] duration-(--duration-filter) ease-(--ease-out) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:duration-100',
        FIELD_SHADOW,
        !pressed && 'bg-white text-foreground hover:bg-accent',
        pressed &&
          tone === 'open' &&
          'bg-[color-mix(in_srgb,#3d8b4f_18%,white)] text-[#2f6b3c] hover:bg-[color-mix(in_srgb,#3d8b4f_26%,white)]',
        pressed &&
          tone === 'closed' &&
          'bg-[color-mix(in_srgb,#c73e52_16%,white)] text-[#9a2f3f] hover:bg-[color-mix(in_srgb,#c73e52_24%,white)]',
        pressed &&
          tone === 'visited' &&
          mode === 'yes' &&
          'bg-[color-mix(in_srgb,#3d8b4f_18%,white)] text-[#2f6b3c] hover:bg-[color-mix(in_srgb,#3d8b4f_26%,white)]',
        pressed && tone === 'visited' && mode === 'no' && 'bg-foreground text-white hover:bg-foreground',
      )}
    >
      <HugeiconsIcon icon={icon} size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}

export function SavedFilters({ filter, onChange }: FilterProps) {
  const { saved } = useTrip();
  const isVisitedPlace = usePlaceVisited();
  const count = (f: SavedFilter) => saved.filter((p) => matchesFilter(p, f, isVisitedPlace)).length;
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
        'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border bg-background px-3 text-[13px] font-semibold whitespace-nowrap text-(--c,inherit) transition-[color,background-color,border-color] duration-(--duration-filter) ease-(--ease-out) hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:duration-100',
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
                  // Sit just under SavedFilters (see FILTERS_STICKY_TOP).
                  `sticky ${FILTERS_STICKY_TOP} z-[9] -mx-[22px] mb-1 bg-background px-[22px] py-1.5 font-bold tracking-[0.06em] in-data-[slot=drawer-popup]:-mx-4 in-data-[slot=drawer-popup]:px-4`,
                )}
              >
                {REGION_LABELS[region]} · {inRegion.length}
              </h2>
            )}
            {inRegion.map((place) => (
              <Row
                key={place.id}
                selection={{ kind: 'place', place }}
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
export function PlaceBackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 border-b bg-background">
      <button
        type="button"
        className="flex min-h-6 w-full touch-manipulation items-center gap-1.5 px-4 text-left text-[15px] font-semibold select-none [-webkit-touch-callout:none] [-webkit-user-select:none] outline-none transition-colors duration-100 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-muted [@media(pointer:coarse)]:min-h-11"
        onClick={onBack}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
        Saved places
      </button>
    </div>
  );
}
