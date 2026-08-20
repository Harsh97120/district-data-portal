"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, LatLngBounds } from "leaflet";
import type { StateGeoProps } from "@/lib/types/district";
import { STATE_BY_GEONAME, CHOROPLETH_STEPS } from "@/lib/constants";
import { fetchGeoJSON, getStateName } from "@/lib/geo-utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// India map center and zoom
const INDIA_CENTER: [number, number] = [22.5, 82.5];
const INDIA_ZOOM = 4.8;

// Choropleth palette (same warm scale used for district maps)
const CHOROPLETH_COLORS = CHOROPLETH_STEPS.map((s) => s.color);

/** Deterministic hash of a string → 0..N-1 */
function nameHash(str: string, n: number): number {
  let h = 0;
  for (const c of str) h = ((h * 31) + c.charCodeAt(0)) >>> 0;
  return h % n;
}

/** Pick a choropleth fill colour for a state by name */
function getStateChoroplethColor(stateName: string): string {
  return CHOROPLETH_COLORS[nameHash(stateName.toLowerCase(), CHOROPLETH_COLORS.length)];
}

function buildStateStyle(stateName: string, hovered: boolean): Record<string, unknown> {
  const fillColor = getStateChoroplethColor(stateName);
  return {
    fillColor,
    fillOpacity: hovered ? 0.95 : 0.65,
    color: hovered ? "#FFFFFF" : "rgba(255,255,255,0.3)",
    weight: hovered ? 2 : 0.8,
    opacity: 1,
  };
}

interface IndiaMapProps {
  /** Called once the map is ready; receives a resetView function for the parent to use */
  onMapReady?: (resetFn: () => void) => void;
}

export default function IndiaMap({ onMapReady }: IndiaMapProps) {
  const mapRef       = useRef<LeafletMap | null>(null);
  const geoLayerRef  = useRef<LeafletGeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boundsRef    = useRef<LatLngBounds | null>(null);

  const [loading, setLoading]           = useState(true);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  /** Fly back to the full-India view */
  const handleReset = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.invalidateSize();
    if (boundsRef.current && boundsRef.current.isValid()) {
      mapRef.current.flyToBounds(boundsRef.current, { padding: [15, 15], maxZoom: 5.2, duration: 0.6 });
    } else {
      mapRef.current.setView(INDIA_CENTER, INDIA_ZOOM);
    }
  }, []);

  useEffect(() => {
    let L: typeof import("leaflet");
    let map: LeafletMap;

    async function init() {
      if (!containerRef.current || mapRef.current) return;

      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

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

      L.control.zoom({ position: "topright" }).addTo(map);
      L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

      const geojson = await fetchGeoJSON("/data/boundaries/india-states.geojson");
      if (!geojson) {
        setError(
          "India states boundary file not found.\nPlease follow the instructions in data/boundaries/README.md to download and place the file."
        );
        setLoading(false);
        return;
      }

      const layer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
        style: (feature) => {
          if (!feature) return {};
          const name = getStateName(feature.properties as StateGeoProps);
          return buildStateStyle(name, false) as Parameters<typeof L.geoJSON>[1] extends { style: infer S }
            ? Parameters<S extends (...args: unknown[]) => unknown ? S : never>[0]
            : never;
        },
        onEachFeature: (feature, featureLayer) => {
          const name = getStateName(feature.properties as StateGeoProps);
          const stateInfo = STATE_BY_GEONAME[name.toLowerCase()];

          featureLayer.on({
            mouseover: (e) => {
              setHoveredState(name);
              const l = e.target;
              l.setStyle(buildStateStyle(name, true));
              l.bringToFront();
            },
            mouseout: (e) => {
              setHoveredState(null);
              layer.resetStyle(e.target);
            },
            click: () => {
              if (stateInfo?.code) window.location.href = `/state/${stateInfo.code}`;
            },
          });

          featureLayer.bindTooltip(
            `<div style="font-family:Inter,sans-serif;padding:4px 8px;font-size:13px;font-weight:600;color:#F0F0F0;background:#1A1D27;border:1px solid #2D3148;border-radius:6px">
              ${name}${stateInfo?.hasData ? '<span style="color:#FF6B35;margin-left:6px;font-size:10px">● Data</span>' : ""}
            </div>`,
            { sticky: true, opacity: 1, className: "leaflet-tooltip-custom" }
          );
        },
      }).addTo(map);

      geoLayerRef.current = layer;

      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        boundsRef.current = bounds;
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [15, 15], maxZoom: 5.2 });
      }

      setLoading(false);

      // Notify parent that the map is ready and hand over the reset function
      onMapReady?.(handleReset);

      setTimeout(() => {
        if (mapRef.current && boundsRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.fitBounds(boundsRef.current, { padding: [15, 15], maxZoom: 5.2 });
        }
      }, 250);
    }

    init();

    // ResizeObserver on map container
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ pan: false });
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full min-h-[450px]">
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

      {/* Hovered state action chip */}
      {hoveredState && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 bg-[#1A1D27]/90 backdrop-blur border border-[#2D3148] rounded-full text-xs text-orange-400 font-semibold pointer-events-none flex items-center gap-1.5 shadow-md animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          <span>Click to explore</span>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full min-h-[450px]" />
    </div>
  );
}
