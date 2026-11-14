import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { STOPS, isPrimary, type Selection } from '../data/derive';
import { DAYS, NIGHTS, NIGHT_NAMES, type DayKey } from '../data/trip';
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

export function DaySection({ day, route, selection, onSelect }: Props) {
  const { name, color, hex, note } = DAYS[day];
  const towns = NIGHTS[day];

  return (
    <section className="day">
      <div className="day-head">
        <h2 style={{ color }}>{name}</h2>
        <span className="stats">{statsText(route)}</span>
      </div>
      {note && <p className="day-note">{note}</p>}

      {STOPS.filter((s) => s.day === day).map((stop) => (
        <Row
          key={stop.n}
          className="stop"
          active={selection?.kind === 'stop' && selection.stop === stop}
          onClick={() => onSelect({ kind: 'stop', stop })}
          icon={<div className={`badge${stop.suggested ? ' suggested' : ''}`} style={cssVar(color)}>{stop.n}</div>}
          label={stop.label}
          title={stop.name}
          body={stop.desc}
        />
      ))}

      <div className="stay-block">
        {towns.length ? (
          <>
            <div className="stay-head">Where to stay · {NIGHT_NAMES[day]}</div>
            {towns.map((town) => (
              <Row
                key={town.name}
                className="stop town"
                active={selection?.kind === 'town' && selection.town === town}
                onClick={() => onSelect({ kind: 'town', town, day })}
                icon={<div className={`zone-swatch${isPrimary(town) ? ' primary' : ''}`} style={cssVar(hex)} />}
                label={town.tag}
                title={town.name}
                body={town.note}
              />
            ))}
          </>
        ) : (
          <div className="stay-head">No overnight · evening train to Taipei</div>
        )}
      </div>
    </section>
  );
}

const cssVar = (c: string) => ({ '--c': c }) as CSSProperties;

interface RowProps {
  className: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  title: string;
  body: string;
}

function Row({ className, active, onClick, icon, label, title, body }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active]);

  return (
    <div ref={ref} className={`${className}${active ? ' active' : ''}`} onClick={onClick}>
      {icon}
      <div>
        <div className="label">{label}</div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}
