import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Popup } from 'react-map-gl/mapbox';
import { describe, pointOf, type Selection } from '../data/derive';

// closeOnClick is off because TripMap's click handler decides what an empty-map click means.
export function InfoPopup({ selection }: { selection: Selection }) {
  const { color, label, title, body, href, photos } = describe(selection);
  const [lng, lat] = pointOf(selection);
  const isStop = selection.kind === 'stop';
  const photo = photos[0];

  return (
    <Popup
      key={isStop ? `stop-${selection.stop.n}` : `town-${selection.town.name}`}
      longitude={lng}
      latitude={lat}
      offset={isStop ? 18 : undefined}
      maxWidth={isStop ? undefined : '280px'}
      closeButton={false}
      closeOnClick={false}
      focusAfterOpen={false}
    >
      {photo && (
        <img
          src={photo}
          alt={title}
          className="-mx-4 -mt-3.5 mb-2.5 block aspect-video w-[calc(100%+2rem)] max-w-none rounded-t-[12px] bg-muted object-cover"
        />
      )}
      <div className="mb-1 text-[11px] font-semibold tracking-[0.05em] uppercase" style={{ color }}>
        {label}
      </div>
      <h3 className="mb-1.5 text-[15px] font-bold">{title}</h3>
      <p className="mb-2.5 text-[13px] leading-[1.45] text-muted-foreground">{body}</p>
      {href && (
        <a
          className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-foreground underline"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={2} />
        </a>
      )}
    </Popup>
  );
}
