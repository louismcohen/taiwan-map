/**
 * Friday Coast / Cut inland / Valley picker. Kept for easy re-enable — not mounted in the UI
 * while the trip is locked to plan A (Coast). Wire into DayScrubber with `open={day === 'fri'}`.
 */
import { cn } from '@/lib/utils';
import { useTrip } from '../data/TripContext';
import { PLAN_OPTIONS, type PlanVariant } from '../data/trip';

export function FridayPlanPicker({ open }: { open: boolean }) {
  const { variant, setVariant } = useTrip();

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden" inert={open ? undefined : true}>
        <fieldset className="mt-2 min-w-0 border-0 border-t border-dashed p-0 pt-2">
          <legend className="mb-1.5 float-none w-full px-0 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            Friday route
          </legend>
          <div className="flex gap-1.5">
            {PLAN_OPTIONS.map((plan) => (
              <PlanChip
                key={plan.id}
                plan={plan.id}
                label={`${plan.id} · ${plan.short}`}
                selected={variant === plan.id}
                onSelect={setVariant}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function PlanChip({
  plan,
  label,
  selected,
  onSelect,
}: {
  plan: PlanVariant;
  label: string;
  selected: boolean;
  onSelect: (plan: PlanVariant) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-(--fri) bg-(--fri) text-white'
          : 'border-border bg-background text-foreground hover:bg-accent',
      )}
      onClick={() => onSelect(plan)}
    >
      {label}
    </button>
  );
}
