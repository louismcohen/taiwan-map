export const MAPBOX_TOKEN: string = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.error('VITE_MAPBOX_TOKEN is not set; copy .env.example to .env.local and add your Mapbox token.');
}
