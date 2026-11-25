import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import type { Selection } from '../data/derive';
import { useVisited } from '../data/visited';

/** Boolean chip on the title row. Stops the row click and the detail swipe from seeing the press. */
export function VisitedToggle({ selection }: { selection: Selection }) {
  const { has, toggle } = useVisited();
  const on = has(selection);

  const stop = (e: PointerEvent<HTMLButtonElement>) => e.stopPropagation();

  return (
    <button
      type="button"
      aria-pressed={on}
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation();
        toggle(selection);
      }}
      className={cn(
        'relative z-10 inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold whitespace-nowrap transition-[color,background-color,border-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        on
          ? 'border-transparent bg-[#2f6b3c] text-white hover:bg-[#275c33]'
          : 'border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground',
      )}
    >
      <span className="grid size-3 place-items-center" aria-hidden>
        {on ? (
          <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2.6} />
        ) : (
          <span className="size-[9px] rounded-full border border-current" />
        )}
      </span>
      Visited
    </button>
  );
}
