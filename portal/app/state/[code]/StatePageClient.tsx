"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { DistrictMetrics } from "@/lib/types/district";
import { STATE_BY_CODE } from "@/lib/constants";
import Breadcrumb from "@/components/ui/Breadcrumb";
import DistrictPanel from "@/components/district/DistrictPanel";
import MapLegend from "@/components/map/MapLegend";
import StateMapWrapper from "@/components/map/StateMapWrapper";

interface StatePageClientProps {
  stateCode: string;
}

/** Refresh / circular-arrows icon */
function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 flex-none transition-transform duration-500 ${spinning ? "rotate-[360deg]" : ""}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}

export default function StatePageClient({ stateCode }: StatePageClientProps) {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictMetrics | null>(null);
  const [metrics, setMetrics]                   = useState<DistrictMetrics[] | null>(null);
  const [spinning, setSpinning]                 = useState(false);
  const resetFnRef                              = useRef<(() => void) | null>(null);

  const handleDistrictSelect = useCallback((district: DistrictMetrics | null) => {
    setSelectedDistrict(district);
  }, []);

  const handleMapReady = useCallback((fn: () => void) => {
    resetFnRef.current = fn;
  }, []);

  const handleReset = useCallback(() => {
    resetFnRef.current?.();
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
  }, []);

  // Fetch metrics dynamically to calculate state averages for the header dashboard
  useEffect(() => {
    import("@/lib/data-loader").then((mod) => {
      mod.fetchDistrictMetrics(stateCode).then(setMetrics);
    });
  }, [stateCode]);

  const stateInfo = STATE_BY_CODE[stateCode];

  // Computations for state header summary
  const totalDistricts = metrics?.length || 0;
  const avgLiteracy = metrics && totalDistricts > 0
    ? metrics.reduce((sum, d) => sum + (d.literacy_rate || 0), 0) / totalDistricts
    : 0;
  const avgSexRatio = metrics && totalDistricts > 0
    ? metrics.reduce((sum, d) => sum + (d.sex_ratio || 0), 0) / totalDistricts
    : 0;

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">

      {/* Page header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-[#2D3148] flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <Breadcrumb
            items={[
              { label: "India", href: "/" },
              { label: stateInfo?.name ?? stateCode },
            ]}
          />
          <h1 className="text-xl font-bold text-white mt-1">
            {stateInfo?.name ?? stateCode} — District Map
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedDistrict
              ? `Currently viewing details for ${selectedDistrict.district_name}`
              : "Click any district on the interactive map to view ML development details"}
          </p>
        </div>

        {/* Right side: stats */}
        <div className="flex items-center gap-3">
          {/* State Summary Stats */}
          {metrics && totalDistricts > 0 && (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="px-3.5 py-1.5 rounded-xl bg-[#1A1D27] border border-[#2D3148] text-center min-w-[70px] shadow-sm">
                <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Districts</span>
                <strong className="text-sm font-extrabold text-orange-400 block mt-0.5">{totalDistricts}</strong>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-[#1A1D27] border border-[#2D3148] text-center min-w-[90px] shadow-sm">
                <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Avg Literacy</span>
                <strong className="text-sm font-extrabold text-orange-400 block mt-0.5">{avgLiteracy.toFixed(1)}%</strong>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-[#1A1D27] border border-[#2D3148] text-center min-w-[90px] shadow-sm">
                <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Avg Sex Ratio</span>
                <strong className="text-sm font-extrabold text-orange-400 block mt-0.5">{avgSexRatio.toFixed(0)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map + Dynamic District Panel Section */}
      <div className="relative flex-1 flex flex-col lg:flex-row min-h-[550px] lg:h-[calc(100vh-140px)] w-full overflow-hidden">
        {/* Map area — flex-1 will dynamically shrink when panel is active */}
        <div className="relative flex-1 h-full min-h-[450px] w-full transition-all duration-300">
          <StateMapWrapper
            stateCode={stateCode}
            onDistrictSelect={handleDistrictSelect}
            selectedDistrictId={selectedDistrict?.district_id}
            onMapReady={handleMapReady}
          />

          {/* Reset button — static overlay inside map container (top-left, identical to India map) */}
          <button
            id="state-map-reset"
            onClick={handleReset}
            title="Reset map view"
            className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-[#1A1D27]/95 backdrop-blur border border-[#2D3148] text-gray-300
                       hover:text-white hover:border-orange-500/60 hover:bg-[#242838]
                       active:scale-95 transition-all duration-150 shadow-md select-none cursor-pointer"
          >
            <RefreshIcon spinning={spinning} />
            Reset view
          </button>
          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 z-20">
            <MapLegend />
          </div>
        </div>

        {/* District detail panel */}
        <DistrictPanel
          district={selectedDistrict}
          onClose={() => setSelectedDistrict(null)}
        />
      </div>
    </div>
  );
}
