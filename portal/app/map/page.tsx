"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import IndiaMapWrapper from "@/components/map/IndiaMapWrapper";
import Breadcrumb from "@/components/ui/Breadcrumb";

/** Refresh / circular-arrows icon */
function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 flex-none transition-transform duration-500 ${spinning ? "rotate-[360deg]" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}

export default function MapNavigationPage() {
  const resetFnRef = useRef<(() => void) | null>(null);
  const [spinning, setSpinning] = useState(false);

  const handleMapReady = useCallback((fn: () => void) => {
    resetFnRef.current = fn;
  }, []);

  const handleReset = useCallback(() => {
    resetFnRef.current?.();
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
  }, []);

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-64px)] overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 border-b border-[#2D3148] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141722]/80 flex-shrink-0">
        <div>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Map-Based Exploration" },
            ]}
          />
          <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <span>India Interactive Map Explorer</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
              Visual Navigation
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Click any state directly on the map to explore district-level choropleths, boundaries, and demographic data.
          </p>
        </div>

        {/* Alternative mode shortcut */}
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="px-3.5 py-1.5 rounded-xl bg-[#1A1D27] hover:bg-[#242838] border border-[#2D3148] text-xs text-gray-300 hover:text-white font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Switch to Manual Search</span>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Full-width Map View (No sidebar, perfectly fitted to viewport) */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[#0F1117]">
        <IndiaMapWrapper onMapReady={handleMapReady} />

        {/* Reset button — static overlay */}
        <button
          id="india-map-reset"
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

        {/* Helper hint bottom right */}
        <div className="absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-xl bg-[#1A1D27]/90 backdrop-blur border border-[#2D3148] text-[11px] text-gray-300 pointer-events-none shadow-md hidden sm:block">
          🗺️ Click any state on the map to open its district boundary map
        </div>
      </div>
    </div>
  );
}
