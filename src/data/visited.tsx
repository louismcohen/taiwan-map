import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { Selection } from './derive';
import type { SavedPlace } from './saved';

const STORAGE_KEY = 'taiwan-map:visited';

/** Stable id for a stop, stay, or saved place. Compared the same way selections are. */
function selectionKey(selection: Selection): string {
  if (selection.kind === 'stop') return `stop:${selection.stop.name}`;
  if (selection.kind === 'place') return `place:${selection.place.id}`;
  return `town:${selection.town.name}`;
}

function readKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key): key is string => typeof key === 'string');
  } catch {
    return [];
  }
}

interface VisitedContextValue {
  has: (selection: Selection) => boolean;
  toggle: (selection: Selection) => void;
}

const VisitedContext = createContext<VisitedContextValue | null>(null);

export function VisitedProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ReadonlySet<string>>(() => new Set(readKeys()));

  const toggle = useCallback((selection: Selection) => {
    const key = selectionKey(selection);
    setKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }, []);

  const value = useMemo<VisitedContextValue>(
    () => ({
      has: (selection) => keys.has(selectionKey(selection)),
      toggle,
    }),
    [keys, toggle],
  );

  return <VisitedContext.Provider value={value}>{children}</VisitedContext.Provider>;
}

export function useVisited(): VisitedContextValue {
  const visited = useContext(VisitedContext);
  if (!visited) throw new Error('useVisited must be used inside VisitedProvider');
  return visited;
}

/** Whether a saved place is marked visited. Stable until the visited set changes. */
export function usePlaceVisited() {
  const { has } = useVisited();
  return useCallback((place: SavedPlace) => has({ kind: 'place', place }), [has]);
}
