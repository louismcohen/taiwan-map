import { Popup } from 'react-map-gl/mapbox';
import type { Selection } from '../data/derive';
import { DAYS, NIGHT_NAMES } from '../data/trip';
import { gmapsUrl } from '../lib/format';

// closeOnClick is off because TripMap's click handler decides what an empty-map click means.
export function InfoPopup({ selection }: { selection: Selection }) {
  if (selection.kind === 'stop') {
    const { stop } = selection;
    const day = DAYS[stop.day];
    return (
      <Popup
        key={`stop-${stop.n}`}
        longitude={stop.lng}
        latitude={stop.lat}
        offset={18}
        closeButton={false}
        closeOnClick={false}
      >
        <div className="popup">
          <div className="label" style={{ color: day.hex }}>{day.name} · {stop.label}</div>
          <h3>{stop.name}</h3>
          <p>{stop.desc}</p>
          <a href={gmapsUrl(stop)} target="_blank" rel="noopener">Open in Google Maps ↗</a>
        </div>
      </Popup>
    );
  }

  const { town, day, at } = selection;
  const [lng, lat] = at ?? [town.lng, town.lat];
  return (
    <Popup
      key={`town-${town.name}`}
      longitude={lng}
      latitude={lat}
      maxWidth="280px"
      closeButton={false}
      closeOnClick={false}
    >
      <div className="popup">
        <div className="label" style={{ color: DAYS[day].hex }}>{NIGHT_NAMES[day]} · {town.tag}</div>
        <h3>{town.name}</h3>
        <p>{town.note}</p>
      </div>
    </Popup>
  );
}
