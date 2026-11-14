import type { CSSProperties } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { STOPS, type NumberedStop } from '../data/derive';
import { DAYS } from '../data/trip';

interface Props {
  selected: NumberedStop | null;
  onClick: (stop: NumberedStop) => void;
}

export function StopMarkers({ selected, onClick }: Props) {
  return STOPS.map((stop) => {
    const className = 'marker' + (stop.stay || stop.final ? ' stay' : '') + (stop.suggested ? ' suggested' : '')
      + (stop === selected ? ' selected' : '');
    return (
      <Marker
        key={stop.n}
        longitude={stop.lng}
        latitude={stop.lat}
        style={stop === selected ? { zIndex: 1 } : undefined}
        onClick={(e) => {
          // Keep the map's own click handler from treating this as a click on empty map.
          e.originalEvent.stopPropagation();
          onClick(stop);
        }}
      >
        <div className={className} style={{ '--c': DAYS[stop.day].hex } as CSSProperties}>{stop.n}</div>
      </Marker>
    );
  });
}
