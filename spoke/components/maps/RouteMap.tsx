"use client";

/**
 * RouteMap — displays a driving route between two geocoded coordinates on a map.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CURRENT IMPLEMENTATION: Leaflet + OpenStreetMap tiles + OSRM routing (all free, no API key)
 *   - Tiles:   OpenStreetMap  https://tile.openstreetmap.org
 *   - Routing: OSRM demo server  https://router.project-osrm.org
 *     GET /route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson
 *     Returns: distance (meters), duration (seconds), GeoJSON LineString geometry
 *   - Geocoding is handled by the parent via Nominatim; RouteMap only needs coords.
 * ─────────────────────────────────────────────────────────────────────────────
 * TO SWITCH TO MAPBOX:
 *   1. Install: npm install mapbox-gl  (remove leaflet and @types/leaflet)
 *   2. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
 *   3. Replace this entire component with the MapboxRouteMap implementation
 *      found in comments at the bottom of this file.
 *   4. The parent passes identical props — no changes needed there.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";

export interface RouteMapProps {
  /** [lat, lng] for the pickup location */
  originCoords: [number, number];
  /** [lat, lng] for the delivery location */
  destCoords: [number, number];
  /** Display label shown in the origin tooltip */
  originLabel?: string;
  /** Display label shown in the destination tooltip */
  destLabel?: string;
  height?: number;
  /**
   * Called once the OSRM route response arrives with actual road distance and drive time.
   * TODO: When switching to Mapbox Directions, fire the same callback from the Mapbox fetch
   *       — no changes needed in the parent.
   */
  onRouteCalculated?: (distanceMiles: number, durationMinutes: number) => void;
}

export function RouteMap({
  originCoords,
  destCoords,
  originLabel = "Origin",
  destLabel = "Destination",
  height = 280,
  onRouteCalculated,
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  // Keep the callback in a ref so effect deps stay stable (coords only).
  const onRouteCalcRef = useRef(onRouteCalculated);
  useEffect(() => {
    onRouteCalcRef.current = onRouteCalculated;
  });

  // Destructure to primitive numbers so the effect dependency comparison uses value equality,
  // not array reference equality. Without this, every parent re-render creates new array
  // literals → new references → effect fires again → infinite loop.
  const [oLat, oLng] = originCoords;
  const [dLat, dLng] = destCoords;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mapRef.current) return;

    const resolvedOrigin: [number, number] = [oLat, oLng];
    const resolvedDest: [number, number] = [dLat, dLng];

    import("leaflet").then(async (L) => {
      // Fix default marker icon path broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Destroy previous instance on re-render
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const bounds = L.latLngBounds([resolvedOrigin, resolvedDest]);
      const map = L.map(mapRef.current!, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      }).fitBounds(bounds, { padding: [40, 40] });

      mapInstanceRef.current = map;

      // ── TILE LAYER ──────────────────────────────────────────────────────────
      // CURRENT: OpenStreetMap (free, no token)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
      //
      // TO SWITCH TO MAPBOX (replace the block above):
      // L.tileLayer(
      //   `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
      //   { attribution: '© Mapbox', tileSize: 512, zoomOffset: -1, maxZoom: 18 }
      // ).addTo(map);

      // Origin marker (blue pin)
      const originIcon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#3b82f6,#1d4ed8);transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      // Destination marker (dark pin)
      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#111827,#374151);transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker(resolvedOrigin, { icon: originIcon })
        .addTo(map)
        .bindTooltip(originLabel, { permanent: false, direction: "top" });

      L.marker(resolvedDest, { icon: destIcon })
        .addTo(map)
        .bindTooltip(destLabel, { permanent: false, direction: "top" });

      // ── ROUTE LINE ─────────────────────────────────────────────────────────
      // CURRENT: OSRM driving route (free, no API key).
      // Falls back to a straight dashed line if the network request fails.
      //
      // TO SWITCH TO MAPBOX DIRECTIONS (replace the try/catch below):
      // const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      // fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?geometries=geojson&access_token=${token}`)
      //   .then(r => r.json())
      //   .then(data => {
      //     const coords = data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
      //     L.polyline(coords, { color: "#3b82f6", weight: 4, opacity: 0.8 }).addTo(map);
      //     map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
      //     onRouteCalcRef.current?.(data.routes[0].distance / 1609.34, data.routes[0].duration / 60);
      //   });

      const [routeOLng, routeOLat] = [oLng, oLat];
      const [routeDLng, routeDLat] = [dLng, dLat];

      try {
        const res = await fetch(
          `/api/route-proxy?oLng=${routeOLng}&oLat=${routeOLat}&dLng=${routeDLng}&dLat=${routeDLat}`
        );
        const data = await res.json();

        if (data.routes?.[0]) {
          const route = data.routes[0];
          // OSRM returns [lng, lat]; Leaflet expects [lat, lng]
          const coords: [number, number][] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );

          L.polyline(coords, { color: "#3b82f6", weight: 4, opacity: 0.85 }).addTo(map);
          map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });

          onRouteCalcRef.current?.(route.distance / 1609.34, route.duration / 60);
        } else {
          throw new Error("No route");
        }
      } catch {
        // Fallback: straight dashed line
        L.polyline([originCoords, destCoords], {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.7,
          dashArray: "8, 8",
        }).addTo(map);
      }
    });
  }, [oLat, oLng, dLat, dLng]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={mapRef}
        className="w-full overflow-hidden rounded-xl border border-[#e5e7eb]"
        style={{ height }}
      />
    </>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MAPBOX SWAP-OUT — complete replacement component
 * ─────────────────────────────────────────────────────────────────────────────
 * import mapboxgl from "mapbox-gl";
 * import "mapbox-gl/dist/mapbox-gl.css";
 *
 * export function RouteMap({ originCoords, destCoords, originLabel = "Origin", destLabel = "Destination", height = 280, onRouteCalculated }: RouteMapProps) {
 *   const mapRef = useRef<HTMLDivElement>(null);
 *   const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
 *
 *   useEffect(() => {
 *     if (!mapRef.current) return;
 *     mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
 *     if (mapInstanceRef.current) mapInstanceRef.current.remove();
 *     const map = new mapboxgl.Map({ container: mapRef.current, style: "mapbox://styles/mapbox/streets-v12" });
 *     map.fitBounds([[Math.min(originCoords[1], destCoords[1]) - 0.5, Math.min(originCoords[0], destCoords[0]) - 0.5],
 *                    [Math.max(originCoords[1], destCoords[1]) + 0.5, Math.max(originCoords[0], destCoords[0]) + 0.5]], { padding: 60 });
 *     mapInstanceRef.current = map;
 *     map.on("load", () => {
 *       fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?geometries=geojson&access_token=${mapboxgl.accessToken}`)
 *         .then(r => r.json()).then(data => {
 *           map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: data.routes[0].geometry } });
 *           map.addLayer({ id: "route", type: "line", source: "route", layout: { "line-cap": "round" }, paint: { "line-color": "#3b82f6", "line-width": 4 } });
 *           onRouteCalculated?.(data.routes[0].distance / 1609.34, data.routes[0].duration / 60);
 *           new mapboxgl.Marker({ color: "#3b82f6" }).setLngLat([originCoords[1], originCoords[0]]).setPopup(new mapboxgl.Popup().setText(originLabel)).addTo(map);
 *           new mapboxgl.Marker({ color: "#111827" }).setLngLat([destCoords[1], destCoords[0]]).setPopup(new mapboxgl.Popup().setText(destLabel)).addTo(map);
 *         });
 *     });
 *   }, [originCoords, destCoords, originLabel, destLabel, onRouteCalculated]);
 *
 *   return <div ref={mapRef} className="w-full overflow-hidden rounded-xl border border-[#e5e7eb]" style={{ height }} />;
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */
