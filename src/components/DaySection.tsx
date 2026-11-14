import {
  BedIcon,
  Bread01Icon,
  Location01Icon,
  Restaurant01Icon,
  SparklesIcon,
  Train01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';
import { Item, ItemContent, ItemDescription, ItemMedia } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { isPrimary, type Selection, STOPS } from '../data/derive';
import { DAYS, type DayKey, NIGHT_NAMES, NIGHTS, type Stop } from '../data/trip';
import type { RouteResult } from '../lib/directions';
import { fmtKm, fmtTime } from '../lib/format';

interface Props {
  day: DayKey;
  route: RouteResult | undefined;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
}

function statsText(route: RouteResult | undefined) {
  if (!route) return '';
  if (route.distance == null || route.duration == null) return 'route unavailable';
  return `${fmtKm(route.distance)} · ${fmtTime(route.duration)}`;
}

const overline = 'text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase';

const LABEL_ICONS: Record<string, IconSvgElement> = {
  Lunch: Restaurant01Icon,
  Dinner: Restaurant01Icon,
  Snack: Bread01Icon,
};

function stopIcon(stop: Stop) {
  if (stop.stay) return BedIcon;
  if (stop.final) return Train01Icon;
  if (stop.suggested) return SparklesIcon;
  return LABEL_ICONS[stop.label] ?? Location01Icon;
}

export function DaySection({ day, route, selection, onSelect }: Props) {
  const { name, color, hex, note } = DAYS[day];
  const towns = NIGHTS[day];

  return (
    <section
      id={`day-${day}`}
      // In the sheet, the last day fills the list's height so scrolling to it can bring it to the top.
      className="px-[22px] pt-4 pb-1.5 in-data-[slot=drawer-popup]:px-4 in-data-[slot=drawer-popup]:pt-3.5 in-data-[slot=drawer-popup]:last:min-h-[100cqh]"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[13px] font-bold tracking-[0.08em] uppercase" style={{ color }}>
          {name}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">{statsText(route)}</span>
      </div>
      {note && <p className="-mt-0.5 mb-2 text-xs leading-[1.45] text-muted-foreground">{note}</p>}

      {STOPS.filter((s) => s.day === day).map((stop) => (
        <Row
          key={stop.n}
          active={selection?.kind === 'stop' && selection.stop === stop}
          onClick={() => onSelect({ kind: 'stop', stop })}
          icon={
            <div
              className={cn(
                'grid size-[26px] place-items-center rounded-full bg-(--c) text-xs font-bold text-white',
                stop.suggested && 'bg-white text-(--c) shadow-[inset_0_0_0_2px_var(--c)]',
              )}
              style={cssVar(color)}
            >
              {stop.n}
            </div>
          }
          label={stop.label}
          labelIcon={stopIcon(stop)}
          title={stop.name}
          body={stop.desc}
        />
      ))}

      <div className="mt-2 mb-1 border-t border-dashed pt-2.5">
        {towns.length ? (
          <>
            <div className={cn(overline, 'mb-0.5 font-bold tracking-[0.06em]')}>Where to stay · {NIGHT_NAMES[day]}</div>
            {towns.map((town) => (
              <Row
                key={town.name}
                active={selection?.kind === 'town' && selection.town === town}
                onClick={() => onSelect({ kind: 'town', town, day })}
                icon={
                  <div
                    className={cn(
                      'size-[26px] rounded-full border-[1.5px] border-dashed border-(--c) bg-[color-mix(in_srgb,var(--c)_10%,transparent)]',
                      isPrimary(town) && 'border-2 bg-[color-mix(in_srgb,var(--c)_22%,transparent)]',
                    )}
                    style={cssVar(hex)}
                  />
                }
                label={town.tag}
                title={town.name}
                body={town.note}
              />
            ))}
          </>
        ) : (
          <div className={cn(overline, 'mb-0.5 font-bold tracking-[0.06em]')}>
            No overnight · evening train to Taipei
          </div>
        )}
      </div>
    </section>
  );
}

const cssVar = (c: string) => ({ '--c': c }) as CSSProperties;

interface RowProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  labelIcon?: IconSvgElement;
  title: string;
  body: string;
}

function Row({ active, onClick, icon, label, labelIcon, title, body }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active]);

  return (
    <Item
      ref={ref}
      className={cn(
        'relative -mx-2.5 w-auto flex-nowrap items-start gap-3 rounded-[10px] p-2.5 duration-150 hover:bg-accent',
        active && 'bg-accent',
      )}
    >
      <ItemMedia>{icon}</ItemMedia>
      <ItemContent className="min-w-0 gap-0">
        <div className={cn(overline, 'mb-[3px] flex items-center gap-1')}>
          {labelIcon && <HugeiconsIcon icon={labelIcon} size={12} strokeWidth={2} className="shrink-0" />}
          {label}
        </div>
        <h3 className="mb-0.5 text-sm leading-[1.3] font-bold">
          {/* Stretched over the whole row so the row is one click target. */}
          <button
            type="button"
            className="text-left after:absolute after:inset-0 after:rounded-[10px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
            aria-pressed={active}
            onClick={onClick}
          >
            {title}
          </button>
        </h3>
        <ItemDescription className="line-clamp-none text-[12.5px] leading-[1.45]">{body}</ItemDescription>
      </ItemContent>
    </Item>
  );
}
