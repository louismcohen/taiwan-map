import { ArrowLeft01Icon, ArrowRight01Icon, ArrowUpRight01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { describe, ITINERARY, isSameSelection, type Selection } from '../data/derive';

interface Props {
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onClose: () => void;
}

export function SelectionDetail({ selection, onSelect, onClose }: Props) {
  const { color, label, title, body, href, photos } = describe(selection);
  const i = ITINERARY.findIndex((s) => isSameSelection(s, selection));
  const prev = ITINERARY[i - 1];
  const next = ITINERARY[i + 1];

  return (
    <div className="px-4 pt-0.5 pb-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 text-[11px] font-semibold tracking-[0.05em] uppercase" style={{ color }}>
          {label}
        </div>
        <Button
          variant="secondary"
          size="icon-xs"
          className="rounded-full text-muted-foreground"
          aria-label="Close"
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
      </div>
      <h3 className="mt-0.5 mb-1 text-base leading-[1.3] font-bold">{title}</h3>
      <p className="mb-2 text-[13px] leading-[1.45] text-muted-foreground">{body}</p>
      {photos.length > 0 && (
        <div className="-mx-4 mb-1 flex snap-x snap-mandatory scroll-px-4 gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
          {photos.map((photo, i) => (
            <a key={photo} href={photo} target="_blank" rel="noopener noreferrer" className="shrink-0 snap-start">
              <img
                src={photo}
                alt={`${title} (${i + 1} of ${photos.length})`}
                draggable={false}
                className="h-24 w-32 rounded-md bg-muted object-cover"
              />
            </a>
          ))}
        </div>
      )}
      <div className="flex items-center justify-end gap-0.5 text-[13px]">
        {href && (
          <a
            className="mr-auto inline-flex items-center gap-0.5 font-semibold underline"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Google Maps
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={2} />
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="font-semibold"
          disabled={!prev}
          onClick={() => prev && onSelect(prev)}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
          Prev
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="font-semibold"
          disabled={!next}
          onClick={() => next && onSelect(next)}
        >
          Next
          <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
