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

  // Lock body scroll when panel is open
  useEffect(() => {
    if (district) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [district]);

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          district ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed right-0 top-16 bottom-0 z-50
          w-full md:w-[420px] lg:w-[460px]
          bg-[#1A1D27] border-l border-[#2D3148]
          flex flex-col shadow-2xl shadow-black/50
          transition-transform duration-300 ease-in-out
          ${district ? "translate-x-0" : "translate-x-full"}
        `}
        role="dialog"
        aria-label="District detail panel"
        aria-modal="true"
      >
        {district ? (
          <>
            {/* Header */}
            <div className="flex-none px-5 pt-5 pb-4 border-b border-[#2D3148]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {district.district_name}
                  </h2>
                  <p className="text-sm text-orange-400 mt-0.5">{district.state_name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="flex-none w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close panel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#0F1117] border border-[#2D3148] text-gray-400">
                  {district.metadata?.source ?? "NFHS-5"} · {district.metadata?.year ?? "2019-21"}
                </span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#0F1117] border border-[#2D3148] text-gray-400">
                  {district.state_code}
                </span>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* Metric Cards */}
              <section>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
                  Key Indicators
                </h3>
                <div className="grid grid-cols-2 gap-3">
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
              <p className="text-xs text-gray-600">
                Source: {district.metadata?.source ?? "NFHS-5"} ({district.metadata?.year ?? "2019-21"}), Ministry of Health & Family Welfare, Government of India.
              </p>

              {/* Deep link */}
              <Link
                href={`/district/${encodeURIComponent(district.district_id)}`}
                className="block w-full text-center py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium hover:bg-orange-500/20 transition-colors"
              >
                View Full District Page →
              </Link>
            </div>
          </>
        ) : (
          /* Empty state — panel is hidden, but render placeholder */
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <p className="text-gray-500 text-sm">Select a district on the map to see details</p>
          </div>
        )}
      </div>
    </>
  );
}
