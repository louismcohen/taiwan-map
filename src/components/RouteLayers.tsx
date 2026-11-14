import type { FeatureCollection, LineString } from 'geojson';
import { useMemo } from 'react';
import { Layer, type LayerProps, Source } from 'react-map-gl/mapbox';
import { DAYS } from '../data/trip';
import { useRouteFlow } from '../hooks/useRouteFlow';
import type { RouteResult } from '../lib/directions';
import { flowGradient } from '../lib/flowGradient';

const FLOW_LAYER = 'route-flow';
const lineLayout = { 'line-join': 'round', 'line-cap': 'round' } as const;

const casingLayer: LayerProps = {
  id: 'route-casing',
  type: 'line',
  layout: lineLayout,
  paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
};

const lineLayer: LayerProps = {
  id: 'route-line',
  type: 'line',
  layout: lineLayout,
  paint: { 'line-color': ['get', 'color'], 'line-width': 4.5 },
};

// Gradient is animated imperatively by useRouteFlow; this is only the initial frame.
const flowLayer: LayerProps = {
  id: FLOW_LAYER,
  type: 'line',
  layout: lineLayout,
  paint: { 'line-width': 2.5, 'line-gradient': flowGradient(0) },
};

export function RouteLayers({ routes }: { routes: RouteResult[] }) {
  const animate = useRouteFlow(FLOW_LAYER);

  const data = useMemo<FeatureCollection<LineString>>(
    () => ({
      type: 'FeatureCollection',
      features: routes.map((r) => ({
        type: 'Feature',
        properties: { color: DAYS[r.day].hex },
        geometry: r.geometry,
      })),
    }),
    [routes],
  );

  return (
    <Source id="route" type="geojson" lineMetrics data={data}>
      <Layer {...casingLayer} />
      <Layer {...lineLayer} />
      {animate && <Layer {...flowLayer} />}
    </Source>
  );
}
