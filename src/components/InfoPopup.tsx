import { Popup } from 'react-map-gl/mapbox';
import { describe, pointOf, type Selection } from '../data/derive';

// closeOnClick is off because TripMap's click handler decides what an empty-map click means.
export function InfoPopup({ selection }: { selection: Selection }) {
  const { color, label, title, body, href } = describe(selection);
  const [lng, lat] = pointOf(selection);
  const isStop = selection.kind === 'stop';

  return (
    <Popup
      key={isStop ? `stop-${selection.stop.n}` : `town-${selection.town.name}`}
      longitude={lng}
      latitude={lat}
      offset={isStop ? 18 : undefined}
      maxWidth={isStop ? undefined : '280px'}
      closeButton={false}
      closeOnClick={false}
    >
      <div className="mb-1 text-[11px] font-semibold tracking-[0.05em] uppercase" style={{ color }}>{label}</div>
      <h3 className="mb-1.5 text-[15px] font-bold">{title}</h3>
      <p className="mb-2.5 text-[13px] leading-[1.45] text-muted-foreground">{body}</p>
      {href && (
        <a className="text-[13px] font-semibold text-foreground underline" href={href} target="_blank" rel="noopener noreferrer">
          Open in Google Maps ↗
        </a>
      )}
    </Popup>
  );
}
