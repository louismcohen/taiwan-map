// Mapbox tokens the browser uses are public (pk.*) by design; this only moves the token from the
// build to the server, for hosts whose secrets can't be VITE_ variables.
export function GET() {
  return Response.json({ token: process.env.MAPBOX_TOKEN ?? '' }, { headers: { 'cache-control': 'no-store' } });
}
