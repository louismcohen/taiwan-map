let mapboxToken: string = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

/**
 * Hosts that can't inline a VITE_ variable at build time serve the token from `api/mapbox-token`
 * instead, so this runs before the app renders.
 */
export async function loadMapboxToken() {
  if (!mapboxToken) {
    try {
      const res = await fetch('api/mapbox-token');
      if (res.ok) mapboxToken = (await res.json()).token ?? '';
    } catch {
      // No such route, e.g. the dev server answering with index.html.
    }
  }
  if (!mapboxToken) {
    console.error('VITE_MAPBOX_TOKEN is not set; copy .env.example to .env.local and add your Mapbox token.');
  }
}

export const getMapboxToken = () => mapboxToken;
