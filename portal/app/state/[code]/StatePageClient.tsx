"use client";

import { useState, useCallback } from "react";
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

  const handleDistrictSelect = useCallback((district: DistrictMetrics | null) => {
    setSelectedDistrict(district);
  }, []);

  const stateInfo = STATE_BY_CODE[stateCode];

  return (
    <div className="flex flex-col flex-1">
      {/* Page header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-[#2D3148] flex items-center justify-between gap-4">
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
          {!selectedDistrict && (
            <p className="text-sm text-gray-500 mt-0.5">
              Click a district to view demographic details
            </p>
          )}
        </div>
        {selectedDistrict && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-orange-400 font-medium animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            {selectedDistrict.district_name} selected
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
