"use client";

import { useState, useCallback, useEffect } from "react";
import type { DistrictMetrics } from "@/lib/types/district";
import { STATE_BY_CODE } from "@/lib/constants";
import Breadcrumb from "@/components/ui/Breadcrumb";
import DistrictPanel from "@/components/district/DistrictPanel";
import MapLegend from "@/components/map/MapLegend";
import StateMapWrapper from "@/components/map/StateMapWrapper";

interface StatePageClientProps {
  stateCode: string;
}

export default function StatePageClient({ stateCode }: StatePageClientProps) {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictMetrics | null>(null);
  const [metrics, setMetrics] = useState<DistrictMetrics[] | null>(null);

  const handleDistrictSelect = useCallback((district: DistrictMetrics | null) => {
    setSelectedDistrict(district);
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
    <div className="flex flex-col flex-1">
      {/* Page header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-[#2D3148] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* Map area */}
      <div className="relative flex-1 min-h-[500px] h-[calc(100vh-140px)] w-full">
        <StateMapWrapper
          stateCode={stateCode}
          onDistrictSelect={handleDistrictSelect}
          selectedDistrictId={selectedDistrict?.district_id}
        />
        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 z-20">
          <MapLegend />
        </div>
      </div>

      {/* District detail panel (slide-in from right) */}
      <DistrictPanel
        district={selectedDistrict}
        onClose={() => setSelectedDistrict(null)}
      />
    </div>
  );
}
