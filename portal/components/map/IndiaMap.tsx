"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from "leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { StateGeoProps } from "@/lib/types/district";
import { STATE_BY_GEONAME } from "@/lib/constants";
import { fetchGeoJSON, getStateName, getStateStyle } from "@/lib/geo-utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// India map centre and zoom
const INDIA_CENTER: [number, number] = [22.5, 82.5];
const INDIA_ZOOM = 5;

export default function IndiaMap() {

  const mapRef = useRef<LeafletMap | null>(null);
  const geoLayerRef = useRef<LeafletGeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let L: typeof import("leaflet");
    let map: LeafletMap;

    async function init() {
      if (!containerRef.current || mapRef.current) return;

      // Dynamically import Leaflet (avoids SSR issues)
      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // React StrictMode calls effects twice in dev — destroy any stale Leaflet instance first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((containerRef.current as any)._leaflet_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (containerRef.current as any)._leaflet_id = undefined;
      }

      map = L.map(containerRef.current, {
        center: INDIA_CENTER,
        zoom: INDIA_ZOOM,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      // Custom zoom control (top-right)
      L.control.zoom({ position: "topright" }).addTo(map);
      L.control.attribution({ position: "bottomright", prefix: false })
        .addTo(map)
        .setPrefix('© <a href="https://github.com/datta07/INDIAN-SHAPEFILES">datta07</a>');

      // Load India states GeoJSON
      const geojson = await fetchGeoJSON("/data/boundaries/india-states.geojson");
      if (!geojson) {
        setError("India states boundary file not found.\nPlease follow the instructions in data/boundaries/README.md to download and place the file.");
        setLoading(false);
        return;
      }

      const layer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
        style: (feature) => {
          if (!feature) return {};
          const name = getStateName(feature.properties as StateGeoProps);
          const stateInfo = STATE_BY_GEONAME[name.toLowerCase()];
          return getStateStyle(stateInfo?.hasData ?? false, false) as Parameters<typeof L.geoJSON>[1] extends { style: infer S } ? Parameters<S extends (...args: unknown[]) => unknown ? S : never>[0] : never;
        },
        onEachFeature: (feature, featureLayer) => {
          const name = getStateName(feature.properties as StateGeoProps);
          const stateInfo = STATE_BY_GEONAME[name.toLowerCase()];

          featureLayer.on({
            mouseover: (e) => {
              setHoveredState(name);
              const l = e.target;
              l.setStyle(getStateStyle(stateInfo?.hasData ?? false, true));
              l.bringToFront();
            },
            mouseout: (e) => {
              setHoveredState(null);
              layer.resetStyle(e.target);
            },
            click: () => {
              if (stateInfo?.code) {
                window.location.href = `/state/${stateInfo.code}`;
              }
            },
          });

          featureLayer.bindTooltip(
            `<div style="font-family:Inter,sans-serif;padding:4px 8px;font-size:13px;font-weight:600;color:#F0F0F0;background:#1A1D27;border:1px solid #2D3148;border-radius:6px">
              ${name}${stateInfo?.hasData ? '<span style="color:#FF6B35;margin-left:6px;font-size:10px">● Data</span>' : ''}
            </div>`,
            { sticky: true, opacity: 1, className: "leaflet-tooltip-custom" }
          );
        },
      }).addTo(map);

      geoLayerRef.current = layer;

      // Fit India bounds
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [20, 20] });
      }

      setLoading(false);

      // Extra invalidateSize after DOM update
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          }
        }
      }, 200);
    }

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0F1117]">
          <LoadingSpinner label="Loading India map…" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0F1117] p-8 text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="text-white font-semibold mb-2">Boundary file missing</p>
          <p className="text-gray-400 text-sm whitespace-pre-line max-w-sm">{error}</p>
        </div>
      )}
      {/* Hovered state tooltip bar */}
      {hoveredState && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-[#1A1D27]/90 backdrop-blur border border-[#2D3148] rounded-full text-sm text-white font-medium pointer-events-none">
          {hoveredState}
          {STATE_BY_GEONAME[hoveredState.toLowerCase()]?.hasData && (
            <span className="ml-2 text-orange-400 text-xs">● Has data — click to explore</span>
          )}
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[500px]" />
    </div>
  );
}
