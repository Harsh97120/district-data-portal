"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, LatLngBounds } from "leaflet";
import type { DistrictMetrics } from "@/lib/types/district";
import type { DistrictGeoProps } from "@/lib/types/district";
import {
  fetchGeoJSON,
  getDistrictName,
  normalise,
} from "@/lib/geo-utils";
import { fetchDistrictMetrics, buildDistrictNameMap } from "@/lib/data-loader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTheme } from "@/lib/ThemeContext";
import { getMpiChoroplethColor } from "@/lib/mpi-state-data";
import {
  fetchMpiDistricts,
  getDistrictMpiHcr,
  type MpiDistrictRecord,
} from "@/lib/mpi-district-data";

interface StateMapProps {
  stateCode: string;
  onDistrictSelect: (district: DistrictMetrics | null) => void;
  selectedDistrictId?: string | null;
  /** Called once the map is ready; receives a resetView function for the parent to use */
  onMapReady?: (resetFn: () => void) => void;
}

export default function StateMap({ stateCode, onDistrictSelect, selectedDistrictId, onMapReady }: StateMapProps) {
  const mapRef         = useRef<LeafletMap | null>(null);
  const containerRef   = useRef<HTMLDivElement | null>(null);
  const geoLayerRef    = useRef<LeafletGeoJSON | null>(null);
  const districtMapRef = useRef<Map<string, DistrictMetrics> | null>(null);
  const mpiRecordsRef  = useRef<Record<string, MpiDistrictRecord> | null>(null);
  const boundsRef      = useRef<LatLngBounds | null>(null);

  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<{
    name: string;
    mpiHcr: number | null | undefined;
    color: string;
  } | null>(null);
  const stateOutlineLayerRef  = useRef<LeafletGeoJSON | null>(null);

  const getDistrictFeatureStyle = useCallback(
    (mpiHcr: number | null | undefined, isSelected: boolean, currentTheme: string) => {
      const fillColor = getMpiChoroplethColor(mpiHcr);
      return {
        fillColor,
        fillOpacity: isSelected ? 0.95 : (currentTheme === "dark" ? 0.75 : 0.7),
        color: isSelected
          ? "#FF6B35"
          : (currentTheme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(17,24,39,0.2)"),
        weight: isSelected ? 2.5 : 0.8,
        opacity: 1,
      };
    },
    []
  );

  const updateStyles = useCallback((selectedId: string | null | undefined) => {
    const layer = geoLayerRef.current;
    const districtMap = districtMapRef.current;
    const mpiRecords = mpiRecordsRef.current;
    if (!layer || !districtMap) return;

    layer.eachLayer((featureLayer) => {
      const l = featureLayer as typeof featureLayer & {
        feature?: { properties?: DistrictGeoProps };
        setStyle: (s: Record<string, unknown>) => void;
      };
      const props = l.feature?.properties as DistrictGeoProps | undefined;
      if (!props) return;
      const name = getDistrictName(props);
      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const data = districtMap.get(normalise(name)) ?? districtMap.get(slug(name));
      const isSelected = !!selectedId && data?.district_id === selectedId;
      const mpiHcr = getDistrictMpiHcr(data?.district_id, name, stateCode, mpiRecords);
      l.setStyle(getDistrictFeatureStyle(mpiHcr, isSelected, theme));
    });
  }, [theme, stateCode, getDistrictFeatureStyle]);

  /** Fly back to the full-state view */
  const handleReset = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.invalidateSize();
    if (boundsRef.current && boundsRef.current.isValid()) {
      mapRef.current.flyToBounds(boundsRef.current, { padding: [25, 25], duration: 0.6 });
    }
  }, []);

  useEffect(() => {
    let L: typeof import("leaflet");
    let map: LeafletMap;

    async function init() {
      if (!containerRef.current || mapRef.current) return;

      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // React StrictMode calls effects twice in dev — destroy any stale Leaflet instance first
      if ((containerRef.current as any)._leaflet_id) {
        (containerRef.current as any)._leaflet_id = undefined;
      }

      map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.control.zoom({ position: "topright" }).addTo(map);
      L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

      // Load boundary files, metrics, and MPI dataset in parallel
      const [geojson, metrics, stateOutline, mpiRecords] = await Promise.all([
        fetchGeoJSON(`/data/boundaries/districts/${stateCode}.geojson`),
        fetchDistrictMetrics(stateCode),
        fetchGeoJSON(`/data/boundaries/districts/${stateCode}-state.geojson`),
        fetchMpiDistricts(),
      ]);

      if (!geojson) {
        setError(
          `District boundary file not found: /data/boundaries/districts/${stateCode}.geojson\n\nFollow the instructions in data/boundaries/README.md to download the file.`
        );
        setLoading(false);
        return;
      }

      const districtMap = buildDistrictNameMap(metrics ?? []);
      districtMapRef.current = districtMap;
      mpiRecordsRef.current = mpiRecords;

      const layer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
        style: (feature) => {
          if (!feature) return {};
          const name = getDistrictName(feature.properties as DistrictGeoProps);
          const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const data = districtMap.get(normalise(name)) ?? districtMap.get(slug(name));
          const mpiHcr = getDistrictMpiHcr(data?.district_id, name, stateCode, mpiRecords);
          return getDistrictFeatureStyle(mpiHcr, false, theme);
        },
        onEachFeature: (feature, featureLayer) => {
          const name = getDistrictName(feature.properties as DistrictGeoProps);
          const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const data = districtMap.get(normalise(name)) ?? districtMap.get(slug(name));
          const mpiHcr = getDistrictMpiHcr(data?.district_id, name, stateCode, mpiRecords);

          featureLayer.on({
            mouseover: (e) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const l = e.target as any;
              const isSelected = data?.district_id === selectedDistrictId;
              if (!isSelected) {
                l.setStyle({
                  fillOpacity: 0.95,
                  weight: 2.0,
                  color: theme === "dark" ? "#FFFFFF" : "#111827",
                });
              }
              l.bringToFront();
              setHoveredDistrict({
                name,
                mpiHcr,
                color: getMpiChoroplethColor(mpiHcr),
              });
            },
            mouseout: () => {
              setHoveredDistrict(null);
              updateStyles(selectedDistrictId);
              if (stateOutlineLayerRef.current) {
                stateOutlineLayerRef.current.bringToFront();
              }
            },
            click: () => {
              onDistrictSelect(data ?? null);
            },
          });
          const fillColor = getMpiChoroplethColor(mpiHcr);
          const tooltipContent = `
            <div style="font-family:Inter,sans-serif;padding:5px 9px;font-size:11px;color:#F0F0F0;background:rgba(20,23,34,0.92);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.6);white-space:nowrap;pointer-events:none">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:${fillColor};border:1px solid rgba(255,255,255,0.3);flex-shrink:0"></span>
                <span style="font-size:12px;font-weight:700;color:#FFFFFF;letter-spacing:0.2px">${name}</span>
              </div>
              <div style="font-size:11px;font-weight:600;color:#FFA726;margin-top:2px">
                MPI: <b>${mpiHcr !== null && mpiHcr !== undefined ? `${mpiHcr.toFixed(2)}%` : "No data"}</b>
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

      // Overlay outer state boundary if available (makes outer boundary slightly more prominent)
      if (stateOutline) {
        const outlineLayer = L.geoJSON(stateOutline as GeoJSON.GeoJsonObject, {
          interactive: false,
          style: {
            fill: false,
            color: theme === "dark" ? "#F59E0B" : "#B45309",
            weight: 2.2,
            opacity: 1,
            className: "pointer-events-none",
          },
        }).addTo(map);
        stateOutlineLayerRef.current = outlineLayer;
      }

      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        boundsRef.current = bounds;
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [25, 25] });
      }

      setLoading(false);

      // Notify parent that the map is ready and hand over the reset function
      onMapReady?.(handleReset);

      setTimeout(() => {
        if (mapRef.current && boundsRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.fitBounds(boundsRef.current, { padding: [25, 25] });
        }
      }, 250);
    }

    init();

    // ResizeObserver to dynamically resize Leaflet whenever parent layout shrinks/grows (e.g. side panel toggle)
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
        geoLayerRef.current = null;
        stateOutlineLayerRef.current = null;
      }
    };
  }, [stateCode, onDistrictSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-style, update tooltips and adapt bounds when selection or theme changes
  useEffect(() => {
    updateStyles(selectedDistrictId);
    if (stateOutlineLayerRef.current) {
      stateOutlineLayerRef.current.setStyle({
        fill: false,
        color: theme === "dark" ? "#F59E0B" : "#B45309",
        weight: 2.2,
        opacity: 1,
      });
    }
    if (mapRef.current) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ pan: false });
        }
      }, 150);
    }
  }, [theme, selectedDistrictId, stateCode, updateStyles]);

  return (
    <div className="relative w-full h-full min-h-[450px]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0F1117]">
          <LoadingSpinner label="Loading district map…" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0F1117] p-8 text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="text-white font-semibold mb-2">Boundary file missing</p>
          <p className="text-gray-400 text-sm whitespace-pre-line max-w-sm">{error}</p>
        </div>
      )}

      {/* Non-obstructive Floating Hover Information Pill (Fixed at top-center, never covers districts) */}
      {hoveredDistrict && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-[#1A1D27]/95 backdrop-blur-md border border-orange-500/40 rounded-full text-xs text-white shadow-xl flex items-center gap-2.5 animate-fade-in pointer-events-none select-none max-w-[90%] sm:max-w-max">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20 shadow-xs"
            style={{ backgroundColor: hoveredDistrict.color }}
          />
          <span className="font-bold text-white tracking-wide truncate">{hoveredDistrict.name}</span>
          <span className="text-gray-500">·</span>
          <span className="text-orange-400 font-semibold font-mono whitespace-nowrap">
            {hoveredDistrict.mpiHcr !== null && hoveredDistrict.mpiHcr !== undefined
              ? `MPI: ${hoveredDistrict.mpiHcr.toFixed(2)}%`
              : "No MPI data"}
          </span>
          <span className="text-gray-400 font-normal whitespace-nowrap hidden sm:inline">· Click to view details</span>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full min-h-[450px]" />
    </div>
  );
}
