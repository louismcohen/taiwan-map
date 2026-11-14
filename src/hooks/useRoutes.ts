import { useEffect, useState } from 'react';
import type { Segment } from '../data/derive';
import { fetchRoute, type RouteResult } from '../lib/directions';

/** Routes for each segment, or null while they're still loading. */
export function useRoutes(segments: Segment[]) {
  const [routes, setRoutes] = useState<RouteResult[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(segments.map((seg) => fetchRoute(seg, controller.signal))).then(setRoutes, () => {});
    return () => controller.abort();
  }, [segments]);

  return routes;
}
