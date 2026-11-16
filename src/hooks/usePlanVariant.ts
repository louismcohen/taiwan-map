import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_VARIANT, isPlanVariant, type PlanVariant } from '../data/trip';

const STORAGE_KEY = 'taiwan-map-plan';

function fromUrl(): PlanVariant | null {
  const v = new URLSearchParams(window.location.search).get('plan');
  return v && isPlanVariant(v) ? v : null;
}

function fromStorage(): PlanVariant | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && isPlanVariant(v) ? v : null;
  } catch {
    return null;
  }
}

function read(): PlanVariant {
  return fromUrl() ?? fromStorage() ?? DEFAULT_VARIANT;
}

/**
 * Active Friday plan (A/B/C), synced to `?plan=` and localStorage. Defaults to Coast (A).
 * Unused while the UI is locked to A; pair with FridayPlanPicker to re-enable switching.
 */
export function usePlanVariant() {
  const [variant, setVariantState] = useState<PlanVariant>(read);

  const setVariant = useCallback((next: PlanVariant) => {
    setVariantState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
    const url = new URL(window.location.href);
    if (next === DEFAULT_VARIANT) url.searchParams.delete('plan');
    else url.searchParams.set('plan', next);
    window.history.replaceState(null, '', url);
  }, []);

  useEffect(() => {
    const onPop = () => setVariantState(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return [variant, setVariant] as const;
}
