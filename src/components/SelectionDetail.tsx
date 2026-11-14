import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITINERARY, describe, isSameSelection, type Selection } from '../data/derive';

interface Props {
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onClose: () => void;
}

export function SelectionDetail({ selection, onSelect, onClose }: Props) {
  const { color, label, title, body, href } = describe(selection);
  const i = ITINERARY.findIndex((s) => isSameSelection(s, selection));
  const prev = ITINERARY[i - 1];
  const next = ITINERARY[i + 1];

  return (
    <div className="px-4 pt-0.5 pb-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 text-[11px] font-semibold tracking-[0.05em] uppercase" style={{ color }}>{label}</div>
        <Button
          variant="secondary"
          size="icon-xs"
          className="rounded-full text-muted-foreground"
          aria-label="Close"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <h3 className="mt-0.5 mb-1 text-base leading-[1.3] font-bold">{title}</h3>
      <p className="mb-2 text-[13px] leading-[1.45] text-muted-foreground">{body}</p>
      <div className="flex items-center justify-end gap-0.5 text-[13px]">
        {href && (
          <a className="mr-auto font-semibold underline" href={href} target="_blank" rel="noopener noreferrer">
            Open in Google Maps ↗
          </a>
        )}
        <Button variant="ghost" size="sm" className="font-semibold" disabled={!prev} onClick={() => prev && onSelect(prev)}>
          <ChevronLeft data-icon="inline-start" />
          Prev
        </Button>
        <Button variant="ghost" size="sm" className="font-semibold" disabled={!next} onClick={() => next && onSelect(next)}>
          Next
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
