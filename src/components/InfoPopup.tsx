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
      <div className="popup">
        <div className="label" style={{ color }}>{label}</div>
        <h3>{title}</h3>
        <p>{body}</p>
        {href && <a href={href} target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a>}
      </div>
    </Popup>
  );
}
