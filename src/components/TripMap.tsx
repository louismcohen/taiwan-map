import 'mapbox-gl/dist/mapbox-gl.css';
import type { PaddingOptions } from 'mapbox-gl';
import { type ReactNode, type Ref, useState } from 'react';
import MapGL, { type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox';
import { isSameSelection, type Selection } from '../data/derive';
import type { SavedPlace } from '../data/saved';
import { useTrip } from '../data/TripContext';
import { getMapboxToken } from '../lib/config';
import type { RouteResult } from '../lib/directions';
import { InfoPopup } from './InfoPopup';
import type { MapMode } from './ModeMenu';
import { CLUSTER_LAYER, expandCluster, PlaceMarkers } from './PlaceMarkers';
import { RouteLayers } from './RouteLayers';
import { STAY_FILL_LAYER, StayZones } from './StayZones';
import { StopMarkers } from './StopMarkers';
import { UserLocation, type UserLocationFix } from './UserLocation';

interface Props {
    mapRef: Ref<MapRef>;
    mode: MapMode;
    /** Saved places to show in saved mode, already filtered. */
    places: SavedPlace[];
    /** Overlay in the top corners, e.g. the mode menu and fit button. */
    children?: ReactNode;
    selection: Selection | null;
    onSelect: (selection: Selection | null) => void;
    onReset: () => void;
    routes: RouteResult[] | null;
    /** Off on phones, where the bottom sheet shows the selection instead. */
    popups: boolean;
    /** Only read when the map is created. */
    initialPadding: PaddingOptions;
    /** Last successful geolocation fix, if any. */
    userLocation?: UserLocationFix | null;
}

const INTERACTIVE_LAYERS: Record<MapMode, string[]> = {
    route: [STAY_FILL_LAYER],
    saved: [CLUSTER_LAYER],
};

export function TripMap({
    mapRef,
    mode,
    places,
    children,
    selection,
    onSelect,
    onReset,
    routes,
    popups,
    initialPadding,
    userLocation = null,
}: Props) {
    const { towns, tripBounds } = useTrip();
    const [cursor, setCursor] = useState('');

    const handleClick = (e: MapMouseEvent) => {
        const feature = e.features?.[0];
        if (
            feature?.layer?.id === CLUSTER_LAYER &&
            feature.geometry.type === 'Point'
        ) {
            expandCluster(
                e.target,
                feature.properties?.cluster_id,
                feature.geometry.coordinates as [number, number],
            );
            return;
        }
        const i: number | undefined = feature?.properties?.i;
        if (i == null) {
            onSelect(null);
            return;
        }
        const { town, day } = towns[i];
        onSelect({ kind: 'town', town, day, at: [e.lngLat.lng, e.lngLat.lat] });
    };

    return (
        <div id='map' className='relative h-full flex-1'>
            <MapGL
                ref={mapRef}
                mapboxAccessToken={getMapboxToken()}
                mapStyle='mapbox://styles/mapbox/standard'
                initialViewState={{
                    bounds: tripBounds,
                    fitBoundsOptions: { padding: initialPadding },
                }}
                interactiveLayerIds={INTERACTIVE_LAYERS[mode]}
                cursor={cursor}
                onMouseEnter={() => setCursor('pointer')}
                onMouseLeave={() => setCursor('')}
                onClick={handleClick}
            >
                {mode === 'route' && <StayZones />}
                {routes && (
                    <RouteLayers routes={routes} faint={mode === 'saved'} />
                )}
                {mode === 'route' ? (
                    <StopMarkers
                        selected={
                            selection?.kind === 'stop' ? selection.stop : null
                        }
                        onClick={(stop) =>
                            isSameSelection(selection, { kind: 'stop', stop })
                                ? onReset()
                                : onSelect({ kind: 'stop', stop })
                        }
                    />
                ) : (
                    <PlaceMarkers
                        places={places}
                        selected={
                            selection?.kind === 'place' ? selection.place : null
                        }
                        onClick={(place) =>
                            // Unlike stops, clearing a place keeps the current zoom instead of fitting the whole map.
                            isSameSelection(selection, { kind: 'place', place })
                                ? onSelect(null)
                                : onSelect({ kind: 'place', place })
                        }
                    />
                )}
                {userLocation && <UserLocation location={userLocation} />}
                {popups && selection && <InfoPopup selection={selection} />}
            </MapGL>
            {children}
        </div>
    );
}
