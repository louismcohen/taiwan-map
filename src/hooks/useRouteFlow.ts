import { useEffect, useState } from 'react';
import { useMap } from 'react-map-gl/mapbox';
import { FLOW_PERIOD, flowGradient } from '../lib/flowGradient';

/** Animates the line gradient of `layerId`; returns false when the user prefers reduced motion. */
export function useRouteFlow(layerId: string) {
  const { current: mapRef } = useMap();
  const [enabled] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (!mapRef || !enabled) return;
    const map = mapRef.getMap();
    let frame = requestAnimationFrame(function tick(now) {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'line-gradient', flowGradient((now % FLOW_PERIOD) / FLOW_PERIOD));
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [mapRef, layerId, enabled]);

  return enabled;
}
