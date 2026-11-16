import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';
import { Item, ItemContent, ItemDescription, ItemMedia } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { isPrimary, isSameSelection, type Selection } from '../data/derive';
import { useTrip } from '../data/TripContext';
import { type DayKey, NIGHT_NAMES } from '../data/trip';
import { stopIcon } from '../lib/stopIcon';

interface Props {
  day: DayKey;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
}

const overline = 'text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase';

export function DaySection({ day, selection, onSelect }: Props) {
  const { days, stops, nights } = useTrip();
  const { name, color, hex, note } = days[day];
  const towns = nights[day];

  return (
    <section
      id={`day-${day}`}
      className="px-[22px] pt-4 pb-1.5 in-data-[slot=drawer-popup]:px-4 in-data-[slot=drawer-popup]:pt-3.5"
    >
      {/* The day scrubber names the current day; the heading stays for screen reader navigation. */}
      <h2 className="sr-only">{name}</h2>
      <div aria-hidden className="mb-2.5 h-[3px] w-5 rounded-full" style={{ background: color }} />
      {note && <p className="mb-2 text-xs leading-[1.45] text-muted-foreground">{note}</p>}

      {stops
        .filter((s) => s.day === day)
        .map((stop) => (
          <Row
            key={stop.n}
            active={selection?.kind === 'stop' && isSameSelection(selection, { kind: 'stop', stop })}
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
                active={selection?.kind === 'town' && isSameSelection(selection, { kind: 'town', town, day })}
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
