import type { CSSProperties } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { cn } from '@/lib/utils';
import { type NumberedStop, STOPS } from '../data/derive';
import { DAYS } from '../data/trip';

interface Props {
  selected: NumberedStop | null;
  onClick: (stop: NumberedStop) => void;
}

export function StopMarkers({ selected, onClick }: Props) {
  return STOPS.map((stop) => (
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
      <div
        className={cn(
          'grid size-[30px] cursor-pointer place-items-center rounded-full border-[2.5px] border-white bg-(--c) text-[13px] leading-none font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]',
          (stop.stay || stop.final) && 'rounded-[8px]',
          stop.suggested && 'size-6 border-(--c) bg-white text-[11px] text-(--c) shadow-[0_1px_4px_rgba(0,0,0,0.25)]',
          stop === selected && 'shadow-[0_0_0_2.5px_var(--c),0_2px_8px_rgba(0,0,0,0.4)]',
        )}
        style={{ '--c': DAYS[stop.day].hex } as CSSProperties}
      >
        {stop.n}
      </div>
    </Marker>
  ));
}
