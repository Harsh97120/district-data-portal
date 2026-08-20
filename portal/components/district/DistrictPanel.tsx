"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { DistrictMetrics } from "@/lib/types/district";
import { PRIMARY_METRICS } from "@/lib/constants";
import MetricCard from "@/components/district/MetricCard";
import DemographicsChart from "@/components/district/DemographicsChart";

interface DistrictPanelProps {
  district: DistrictMetrics | null;
  onClose: () => void;
}

export default function DistrictPanel({ district, onClose }: DistrictPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!district) return null;

  return (
    <>
      {/* Mobile Backdrop (only on screens < lg) */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* District Panel: Inline sidebar on desktop (lg:), fixed slide-in on mobile */}
      <div
        ref={panelRef}
        className="
          fixed inset-y-0 right-0 z-50 w-full sm:w-[420px]
          lg:static lg:z-10 lg:w-[440px] xl:w-[480px] lg:h-full lg:min-h-0
          bg-[#1A1D27] border-l border-[#2D3148]
          flex flex-col shadow-2xl lg:shadow-none
          flex-shrink-0 animate-fade-in
        "
        role="dialog"
        aria-label="District detail panel"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex-none px-5 pt-5 pb-4 border-b border-[#2D3148] bg-[#141722]/80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                District Profile
              </span>
              <h2 className="text-xl font-bold text-white leading-tight mt-0.5">
                {district.district_name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{district.state_name} ({district.state_code})</p>
            </div>
            <button
              onClick={onClose}
              className="flex-none w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close panel"
              title="Close panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2.5 py-0.5 text-[11px] rounded-full bg-[#0F1117] border border-[#2D3148] text-gray-400 font-medium">
              {district.metadata?.source ?? "NFHS-5"} · {district.metadata?.year ?? "2019-21"}
            </span>
            <span className="px-2.5 py-0.5 text-[11px] rounded-full bg-[#0F1117] border border-[#2D3148] text-gray-400 font-medium">
              ID: {district.district_id}
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Metric Cards */}
          <section>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
              Key Indicators
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {PRIMARY_METRICS.map((field, i) => (
                <MetricCard
                  key={field}
                  field={field}
                  value={district[field as keyof DistrictMetrics] as number | null}
                  highlighted={i === 0}
                />
              ))}
            </div>
          </section>

          {/* Bar Chart */}
          <section>
            <DemographicsChart district={district} />
          </section>

          {/* Source note */}
          <p className="text-[11px] text-gray-500 leading-normal">
            Source: {district.metadata?.source ?? "NFHS-5"} ({district.metadata?.year ?? "2019-21"}), Ministry of Health & Family Welfare, Government of India.
          </p>

          {/* Deep link button */}
          <Link
            href={`/district/${encodeURIComponent(district.district_id)}`}
            className="block w-full text-center py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-all shadow-lg shadow-orange-500/10"
          >
            View Full District Intelligence Dashboard →
          </Link>
        </div>
      </div>
    </>
  );
}
