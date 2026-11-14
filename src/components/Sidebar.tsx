import { DAY_KEYS, type Selection } from '../data/derive';
import type { RouteResult } from '../lib/directions';
import { fmtKm, fmtTime } from '../lib/format';
import { DaySection } from './DaySection';

interface Props {
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  routes: RouteResult[] | null;
}

function totalsText(routes: RouteResult[] | null) {
  if (!routes) return 'Calculating route…';
  if (routes.some((r) => r.distance == null)) return 'Some segments could not be routed';
  const dist = routes.reduce((sum, r) => sum + r.distance!, 0);
  const dur = routes.reduce((sum, r) => sum + r.duration!, 0);
  return `${fmtKm(dist)} total · ~${fmtTime(dur)} riding`;
}

export function Sidebar({ selection, onSelect, routes }: Props) {
  return (
    <aside id="sidebar">
      <header>
        <h1>East Rift &amp; Coast by Scooter</h1>
        <p>Taitung → Hualien · Wed–Sat · outlined stops are suggested additions</p>
        <div id="totals">{totalsText(routes)}</div>
      </header>
      <div id="days">
        {DAY_KEYS.map((day) => (
          <DaySection
            key={day}
            day={day}
            route={routes?.find((r) => r.day === day)}
            selection={selection}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  );
}
