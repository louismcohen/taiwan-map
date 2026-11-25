import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Popup } from 'react-map-gl/mapbox';
import { describe, pointOf, type Selection } from '../data/derive';
import { useTrip } from '../data/TripContext';
import { NoteBlock, PlaceStatusChips } from './PlaceStatus';
import { VisitedToggle } from './VisitedToggle';

function keyOf(sel: Selection) {
  if (sel.kind === 'stop') return `stop-${sel.stop.n}`;
  if (sel.kind === 'place') return `place-${sel.place.id}`;
  return `town-${sel.town.name}`;
}

// closeOnClick is off because TripMap's click handler decides what an empty-map click means.
export function InfoPopup({ selection }: { selection: Selection }) {
  const { days } = useTrip();
  const { color, label, title, subtitle, body, href, photos } = describe(selection, days);
  const [lng, lat] = pointOf(selection);
  const isTown = selection.kind === 'town';
  const isPlace = selection.kind === 'place';
  const photo = photos[0];
  const place = isPlace ? selection.place : null;

  return (
    <Popup
      key={keyOf(selection)}
      longitude={lng}
      latitude={lat}
      offset={isTown ? undefined : 18}
      maxWidth={isTown ? '280px' : undefined}
      closeButton={false}
      closeOnClick={false}
      focusAfterOpen={false}
    >
      {photo && (
        <img
          src={photo}
          alt={title}
          // Popup media appears after a map tap, not on first paint.
          fetchPriority="low"
          className="-mx-4 -mt-3.5 mb-2.5 block aspect-video w-[calc(100%+2rem)] max-w-none rounded-t-[12px] bg-muted object-cover"
        />
      )}
      <div className="mb-1 text-[11px] font-semibold tracking-[0.05em] uppercase" style={{ color }}>
        {label}
      </div>
      <div className="mb-1.5 flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-[15px] leading-[1.3] font-bold">{title}</h3>
        <VisitedToggle selection={selection} />
      </div>
      {subtitle && <p className="-mt-1 mb-1.5 text-xs text-muted-foreground">{subtitle}</p>}
      {place && <PlaceStatusChips place={place} until className="mb-2" />}
      {place?.note ? (
        <NoteBlock className="mb-2.5 text-[13px] whitespace-pre-line">{place.note}</NoteBlock>
      ) : place?.editorial ? (
        <p className="mb-2.5 text-[13px] leading-[1.45] text-muted-foreground">{place.editorial}</p>
      ) : (
        body && <p className="mb-2.5 text-[13px] leading-[1.45] whitespace-pre-line text-muted-foreground">{body}</p>
      )}
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
