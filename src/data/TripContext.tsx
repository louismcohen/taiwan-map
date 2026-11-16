import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { deriveTrip, type TripData } from './derive';
import { DEFAULT_VARIANT, type PlanVariant } from './trip';

interface TripContextValue extends TripData {
  /** Kept for FridayPlanPicker; the live app locks to Coast (A) and does not call this. */
  setVariant: (variant: PlanVariant) => void;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({
  variant = DEFAULT_VARIANT,
  setVariant,
  children,
}: {
  variant?: PlanVariant;
  setVariant?: (variant: PlanVariant) => void;
  children: ReactNode;
}) {
  const trip = useMemo(() => deriveTrip(variant), [variant]);
  const noop = useCallback((_next: PlanVariant) => {}, []);
  const value = useMemo(() => ({ ...trip, setVariant: setVariant ?? noop }), [trip, setVariant, noop]);
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip(): TripContextValue {
  const trip = useContext(TripContext);
  if (!trip) throw new Error('useTrip must be used inside TripProvider');
  return trip;
}
