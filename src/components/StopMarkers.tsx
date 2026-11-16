import { HugeiconsIcon } from '@hugeicons/react';
import type { CSSProperties } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { cn } from '@/lib/utils';
import type { NumberedStop } from '../data/derive';
import { useTrip } from '../data/TripContext';
import { stopIcon } from '../lib/stopIcon';

interface Props {
  selected: NumberedStop | null;
  onClick: (stop: NumberedStop) => void;
}

export function StopMarkers({ selected, onClick }: Props) {
  const { stops, days } = useTrip();

  return stops.map((stop) => (
    <Marker
      key={stop.name}
      longitude={stop.lng}
      latitude={stop.lat}
      style={selected?.name === stop.name ? { zIndex: 1 } : undefined}
      onClick={(e) => {
        // Keep the map's own click handler from treating this as a click on empty map.
        e.originalEvent.stopPropagation();
        onClick(stop);
      }}
    >
      <div
        className={cn(
          // The unselected shadow keeps a zero-width ring layer so the selected ring grows out of it.
          'flex h-[26px] cursor-pointer items-center gap-1 rounded-full border-2 border-white bg-(--c) pr-2 pl-1.5 text-xs leading-none font-bold text-white tabular-nums shadow-[0_0_0_0_var(--c),0_2px_6px_rgba(0,0,0,0.35)] transition-shadow duration-150 ease-out motion-reduce:transition-none',
          (stop.stay || stop.final) && 'rounded-[8px]',
          stop.suggested && 'border-(--c) bg-white text-(--c)',
          selected?.name === stop.name && 'shadow-[0_0_0_2.5px_var(--c),0_2px_8px_rgba(0,0,0,0.4)]',
        )}
        style={{ '--c': days[stop.day].hex } as CSSProperties}
      >
        <HugeiconsIcon icon={stopIcon(stop)} size={14} strokeWidth={2} />
        {stop.n}
      </div>
    </Marker>
  ));
}
