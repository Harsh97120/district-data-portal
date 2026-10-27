"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, LatLngBounds } from "leaflet";
import type { StateGeoProps } from "@/lib/types/district";
import { STATE_BY_GEONAME, CHOROPLETH_STEPS } from "@/lib/constants";
import { fetchGeoJSON, getStateName } from "@/lib/geo-utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTheme } from "@/lib/ThemeContext";

import { getStateMpi, getMpiChoroplethColor } from "@/lib/mpi-state-data";

// India map center and zoom
const INDIA_CENTER: [number, number] = [22.5, 82.5];
const INDIA_ZOOM = 4.8;

function buildStateStyle(stateName: string, hovered: boolean, theme: string = "dark"): Record<string, unknown> {
  const mpi = getStateMpi(stateName);
  const fillColor = getMpiChoroplethColor(mpi);
  return {
    fillColor,
    fillOpacity: hovered ? 0.95 : 0.75,
    color: hovered ? (theme === "dark" ? "#FFFFFF" : "#111827") : (theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(17,24,39,0.15)"),
    weight: hovered ? 2.2 : 0.8,
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

  const { theme } = useTheme();
  const [loading, setLoading]           = useState(true);
  const [hoveredState, setHoveredState] = useState<{ name: string; mpi: number | null; color: string } | null>(null);
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
          return buildStateStyle(name, false, theme) as Parameters<typeof L.geoJSON>[1] extends { style: infer S }
            ? Parameters<S extends (...args: unknown[]) => unknown ? S : never>[0]
            : never;
        },
        onEachFeature: (feature, featureLayer) => {
          const name = getStateName(feature.properties as StateGeoProps);
          const stateInfo = STATE_BY_GEONAME[name.toLowerCase()];
          const mpi = getStateMpi(name);

          featureLayer.on({
            mouseover: (e) => {
              setHoveredState({ name, mpi, color: getMpiChoroplethColor(mpi) });
              const l = e.target;
              l.setStyle(buildStateStyle(name, true, theme));
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

          const fillColor = getMpiChoroplethColor(mpi);
          const tooltipContent = `
            <div style="font-family:Inter,sans-serif;padding:5px 9px;font-size:11px;color:#F0F0F0;background:rgba(20,23,34,0.92);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.6);white-space:nowrap;pointer-events:none">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:${fillColor};border:1px solid rgba(255,255,255,0.3);flex-shrink:0"></span>
                <span style="font-size:12px;font-weight:700;color:#FFFFFF;letter-spacing:0.2px">${name}</span>
              </div>
              <div style="font-size:11px;font-weight:600;color:#FFA726;margin-top:2px">
                MPI: <b>${mpi !== null ? `${mpi.toFixed(2)}%` : "No data"}</b>
              </div>
            </div>`;

          featureLayer.bindTooltip(tooltipContent, {
            direction: "top",
            offset: [0, -16],
            sticky: true,
            opacity: 1,
            className: "leaflet-tooltip-custom",
          });
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

  useEffect(() => {
    const layer = geoLayerRef.current;
    if (!layer) return;
    layer.eachLayer((featureLayer: any) => {
      const feature = featureLayer.feature;
      if (!feature) return;
      const name = getStateName(feature.properties as StateGeoProps);
      featureLayer.setStyle(buildStateStyle(name, false, theme));
    });
  }, [theme]);

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

      {/* Non-obstructive Floating Hover Information Pill (Fixed at top-center, never covers states) */}
      {hoveredState && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-[#1A1D27]/95 backdrop-blur-md border border-orange-500/40 rounded-full text-xs text-white shadow-xl flex items-center gap-2.5 animate-fade-in pointer-events-none select-none max-w-[90%] sm:max-w-max">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20 shadow-xs"
            style={{ backgroundColor: hoveredState.color }}
          />
          <span className="font-bold text-white tracking-wide truncate">{hoveredState.name}</span>
          <span className="text-gray-500">·</span>
          <span className="text-orange-400 font-semibold font-mono whitespace-nowrap">
            {hoveredState.mpi !== null ? `MPI: ${hoveredState.mpi.toFixed(2)}%` : "No MPI data"}
          </span>
          <span className="text-gray-400 font-normal whitespace-nowrap hidden sm:inline">· Click to explore districts</span>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full min-h-[450px]" />
    </div>
  );
}
