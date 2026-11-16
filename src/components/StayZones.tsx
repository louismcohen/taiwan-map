import type { FeatureCollection, Point, Polygon } from 'geojson';
import { useMemo } from 'react';
import { Layer, type LayerProps, Source } from 'react-map-gl/mapbox';
import { isPrimary, type TownEntry } from '../data/derive';
import { useTrip } from '../data/TripContext';
import { circlePolygon, KM_PER_DEG_LAT } from '../lib/geo';

export const STAY_FILL_LAYER = 'stay-fill';

/** `i` indexes into towns so click handlers can recover the town. */
const props = ({ town }: TownEntry, i: number, color: string) => ({
  i,
  name: town.name,
  color,
  primary: isPrimary(town),
});

const fillLayer: LayerProps = {
  id: STAY_FILL_LAYER,
  type: 'fill',
  paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'primary'], 0.28, 0.14] },
};

const outlineLayer: LayerProps = {
  id: 'stay-outline',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 1.5,
    'line-dasharray': [2, 2],
    'line-opacity': ['case', ['get', 'primary'], 0.9, 0.55],
  },
};

const labelLayer: LayerProps = {
  id: 'stay-label',
  type: 'symbol',
  minzoom: 9,
  layout: {
    'text-field': ['get', 'label'],
    'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 12, 13],
    'text-anchor': 'top',
    'text-offset': [0, 0.3],
    'text-line-height': 1.15,
    'text-allow-overlap': false,
  },
  paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
};

export function StayZones() {
  const { towns, days } = useTrip();

  const { zones, labels } = useMemo(() => {
    const zonesData: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: towns.map((x, i) => ({
        type: 'Feature',
        properties: props(x, i, days[x.day].hex),
        geometry: circlePolygon(x.town.lng, x.town.lat, x.town.r),
      })),
    };
    const labelsData: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: towns.map((x, i) => ({
        type: 'Feature',
        properties: {
          ...props(x, i, days[x.day].hex),
          label: `${x.town.name}\n${days[x.day].name} · ${x.town.tag.toLowerCase()}`,
        },
        geometry: { type: 'Point', coordinates: [x.town.lng, x.town.lat - x.town.r / KM_PER_DEG_LAT] },
      })),
    };
    return { zones: zonesData, labels: labelsData };
  }, [towns, days]);

  return (
    <>
      <Source id="stay-zones" type="geojson" data={zones}>
        <Layer {...fillLayer} />
        <Layer {...outlineLayer} />
      </Source>
      <Source id="stay-labels" type="geojson" data={labels}>
        <Layer {...labelLayer} />
      </Source>
    </>
  );
}
