import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies OSRM routing requests to avoid CORS issues.
 * The OSRM demo server blocks browser-origin requests.
 *
 * Usage: GET /api/route-proxy?oLng=...&oLat=...&dLng=...&dLat=...
 *
 * TODO(mapbox): When switching to Mapbox Directions, this proxy is no longer
 * needed — Mapbox allows browser-origin requests with a valid token.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const oLng = searchParams.get("oLng");
  const oLat = searchParams.get("oLat");
  const dLng = searchParams.get("dLng");
  const dLat = searchParams.get("dLat");

  if (!oLng || !oLat || !dLng || !dLat) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`,
      { headers: { "User-Agent": "Spoke/1.0" } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "OSRM request failed" }, { status: 502 });
  }
}
