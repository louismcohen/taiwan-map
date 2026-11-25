import { useMemo } from 'react';
import { Layer, Marker, Source } from 'react-map-gl/mapbox';
import { circlePolygon } from '../lib/geo';

export type UserLocationFix = {
  lng: number;
  lat: number;
  /** Horizontal accuracy in meters from the Geolocation API. */
  accuracy: number;
};

/** Apple / Google–style blue location puck with accuracy halo. */
export function UserLocation({ location }: { location: UserLocationFix }) {
  const accuracy = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      // Floor so a very precise fix still reads as a small soft halo.
      geometry: circlePolygon(location.lng, location.lat, Math.max(location.accuracy, 25) / 1000),
    }),
    [location],
  );

  return (
    <>
      <Source id="user-accuracy" type="geojson" data={accuracy}>
        <Layer id="user-accuracy-fill" type="fill" paint={{ 'fill-color': '#0A84FF', 'fill-opacity': 0.16 }} />
      </Source>
      <Marker longitude={location.lng} latitude={location.lat} anchor="center" style={{ zIndex: 2 }}>
        <div className="user-location-puck" aria-label="Your location" role="img">
          <span className="user-location-puck__pulse" />
          <span className="user-location-puck__dot" />
        </div>
      </Marker>
    </>
  );
}
