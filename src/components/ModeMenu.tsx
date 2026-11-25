import { Menu } from '@base-ui/react/menu';
import { Bookmark02Icon, CenterFocusIcon, Navigation03Icon, Route01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import type { ReactNode } from 'react';
import { SAVED_LIST } from '../data/places';
import { useTrip } from '../data/TripContext';

export type MapMode = 'route' | 'saved';

export const MAP_MODES: readonly MapMode[] = ['route', 'saved'];

/** Street / neighborhood view — Google Maps default and Mapbox GeolocateControl maxZoom. */
export const LOCATE_ZOOM = 15;

const ICONS: Record<MapMode, IconSvgElement> = {
  route: Route01Icon,
  saved: Bookmark02Icon,
};

/** Shared chrome for the round map FABs (mode menu + fit / locate). */
const MAP_FAB =
  'grid size-[38px] cursor-pointer place-items-center rounded-full bg-white text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.18)] transition-transform duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:pointer-events-none disabled:opacity-50';

const synced = new Date(SAVED_LIST.updatedAt).toLocaleDateString(undefined, {
  month: 'short',
  day: 'numeric',
});

interface Props {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
}

export function ModeMenu({ mode, onChange }: Props) {
  const { stops, saved } = useTrip();
  const options: Record<MapMode, { title: string; detail: string }> = {
    route: {
      title: 'Scooter route',
      detail: `${stops.length} stops · Wed–Sat`,
    },
    saved: {
      title: 'Saved places',
      detail: `${saved.length} places · updated ${synced}`,
    },
  };

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={`Map: ${options[mode].title}`}
        className={`absolute top-[calc(env(safe-area-inset-top,0px)+10px)] left-2.5 z-10 ${MAP_FAB} data-[popup-open]:ring-2 data-[popup-open]:ring-ring/40`}
      >
        <HugeiconsIcon icon={ICONS[mode]} size={19} strokeWidth={2} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={8} className="z-50 outline-none">
          <Menu.Popup className="w-[264px] origin-(--transform-origin) rounded-[14px] bg-popover p-1 text-popover-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_10px_30px_rgba(0,0,0,0.18)] transition-[opacity,scale] duration-150 outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
              Show on map
            </div>
            <Menu.RadioGroup value={mode} onValueChange={(value: MapMode) => onChange(value)}>
              {MAP_MODES.map((m) => (
                <Menu.RadioItem
                  key={m}
                  value={m}
                  closeOnClick
                  className="flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 outline-none select-none data-[highlighted]:bg-accent"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-muted text-foreground">
                    <HugeiconsIcon icon={ICONS[m]} size={17} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-[1.3] font-semibold">{options[m].title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{options[m].detail}</span>
                  </span>
                  <Menu.RadioItemIndicator className="shrink-0 text-foreground">
                    <HugeiconsIcon icon={Tick02Icon} size={17} strokeWidth={2.2} />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Stack of top-right map actions (fit, locate, …). */
export function MapFabStack({ children }: { children: ReactNode }) {
  return (
    <div className="absolute top-[calc(env(safe-area-inset-top,0px)+10px)] right-2.5 z-10 flex flex-col gap-2">
      {children}
    </div>
  );
}

/** Fits the map to the current mode's pins / trip. */
export function FitMapButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Show all on map" onClick={onClick} className={MAP_FAB}>
      <HugeiconsIcon icon={CenterFocusIcon} size={19} strokeWidth={2} />
    </button>
  );
}

/** Flies to the device's current location at street/neighborhood zoom. */
export function LocateMapButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Go to my location"
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={onClick}
      className={MAP_FAB}
    >
      <HugeiconsIcon icon={Navigation03Icon} size={19} strokeWidth={2} />
    </button>
  );
}
