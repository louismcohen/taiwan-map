import type { FeatureCollection, LineString } from 'geojson';
import { useMemo } from 'react';
import { Layer, type LayerProps, Source } from 'react-map-gl/mapbox';
import { useTrip } from '../data/TripContext';
import { useRouteFlow } from '../hooks/useRouteFlow';
import type { RouteResult } from '../lib/directions';
import { flowGradient } from '../lib/flowGradient';

const FLOW_LAYER = 'route-flow';
// Mapbox Standard places undraped custom lines in `top` so they stay above roads/buildings.
const lineLayout = { 'line-join': 'round', 'line-cap': 'round' } as const;
const linePaint = { 'line-emissive-strength': 0.8 } as const;

const casingLayer: LayerProps = {
  id: 'route-casing',
  type: 'line',
  slot: 'top',
  layout: lineLayout,
  paint: { ...linePaint, 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
};

const lineLayer: LayerProps = {
  id: 'route-line',
  type: 'line',
  slot: 'top',
  layout: lineLayout,
  paint: { ...linePaint, 'line-color': ['get', 'color'], 'line-width': 4.5 },
};

// Gradient is animated imperatively by useRouteFlow; this is only the initial frame.
const flowLayer: LayerProps = {
  id: FLOW_LAYER,
  type: 'line',
  slot: 'top',
  layout: lineLayout,
  paint: { ...linePaint, 'line-width': 2.5, 'line-gradient': flowGradient(0) },
};

export function RouteLayers({ routes }: { routes: RouteResult[] }) {
  const { days } = useTrip();
  const animate = useRouteFlow(FLOW_LAYER);

  const data = useMemo<FeatureCollection<LineString>>(
    () => ({
      type: 'FeatureCollection',
      features: routes.map((r) => ({
        type: 'Feature',
        properties: { color: days[r.day].hex },
        geometry: r.geometry,
      })),
    }),
    [routes, days],
  );

  // Source only cloneElement's direct children — a Fragment would drop `source`.
  return (
    <Source id="route" type="geojson" lineMetrics data={data}>
      <Layer key="route-casing" {...casingLayer} />
      <Layer key="route-line" {...lineLayer} />
      {animate && <Layer key="route-flow" {...flowLayer} />}
    </Source>
  );
}
