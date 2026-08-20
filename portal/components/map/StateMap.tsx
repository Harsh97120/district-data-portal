"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, LatLngBounds, Layer } from "leaflet";
import type { DistrictMetrics } from "@/lib/types/district";
import type { DistrictGeoProps } from "@/lib/types/district";
import {
  fetchGeoJSON,
  getDistrictName,
  getDistrictStyle,
  normalise,
} from "@/lib/geo-utils";
import { fetchDistrictMetrics, buildDistrictNameMap } from "@/lib/data-loader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

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
  const boundsRef      = useRef<LatLngBounds | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const updateStyles = useCallback((selectedId: string | null | undefined) => {
    const layer = geoLayerRef.current;
    const districtMap = districtMapRef.current;
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
      l.setStyle(getDistrictStyle(data?.literacy_rate, isSelected));
    });
  }, []);

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

      // Load both GeoJSON and metrics in parallel
      const [geojson, metrics] = await Promise.all([
        fetchGeoJSON(`/data/boundaries/districts/${stateCode}.geojson`),
        fetchDistrictMetrics(stateCode),
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

      const layer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
        style: (feature) => {
          if (!feature) return {};
          const name = getDistrictName(feature.properties as DistrictGeoProps);
          const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const data = districtMap.get(normalise(name)) ?? districtMap.get(slug(name));
          return getDistrictStyle(data?.literacy_rate, false);
        },
        onEachFeature: (feature, featureLayer) => {
          const name = getDistrictName(feature.properties as DistrictGeoProps);
          const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const data = districtMap.get(normalise(name)) ?? districtMap.get(slug(name));

          featureLayer.on({
            mouseover: (e) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const l = e.target as any;
              const isSelected = data?.district_id === selectedDistrictId;
              if (!isSelected) {
                l.setStyle({ fillOpacity: 0.9, weight: 1.5, color: "#FFFFFF" });
              }
              l.bringToFront();
            },
            mouseout: () => {
              updateStyles(selectedDistrictId);
            },
            click: () => {
              onDistrictSelect(data ?? null);
            },
          });

          const tooltipContent = data
            ? `<div style="font-family:Inter,sans-serif;padding:6px 10px;font-size:12px;color:#F0F0F0;background:#1A1D27;border:1px solid #2D3148;border-radius:8px">
                <strong style="font-size:13px;color:#fff">${name}</strong><br/>
                <span style="color:#9CA3AF">Literacy: </span>
                <span style="color:#FF6B35;font-weight:600">${data.literacy_rate?.toFixed(1) ?? "—"}%</span>
              </div>`
            : `<div style="font-family:Inter,sans-serif;padding:6px 10px;font-size:12px;color:#9CA3AF;background:#1A1D27;border:1px solid #2D3148;border-radius:8px">${name}</div>`;

          featureLayer.bindTooltip(tooltipContent, {
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
      }
    };
  }, [stateCode, onDistrictSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-style and adapt bounds when selection changes
  useEffect(() => {
    updateStyles(selectedDistrictId);
    if (mapRef.current) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ pan: false });
        }
      }, 150);
    }
  }, [selectedDistrictId, updateStyles]);

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
      <div ref={containerRef} className="w-full h-full min-h-[450px]" />
    </div>
  );
}
