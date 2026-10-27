"use client";

import { useState } from "react";
import { MPI_CHOROPLETH_RANGES } from "@/lib/mpi-state-data";

interface MPIChoroplethLegendProps {
  hasMissingData?: boolean;
  totalItemsLabel?: string;
}

export default function MPIChoroplethLegend({
  hasMissingData = false,
  totalItemsLabel = "28 States & 8 UTs",
}: MPIChoroplethLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="bg-[#1A1D27]/95 backdrop-blur-md border border-[#2D3148] rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden select-none"
      style={{ width: collapsed ? "auto" : "190px" }}
    >
      {/* Header bar with toggle */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#242838]/60 transition-colors border-b border-[#2D3148]/60"
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 flex-shrink-0 animate-pulse" />
          <div className="leading-tight">
            <h4 className="text-xs font-bold text-white tracking-wide">
              MPI Headcount Ratio
            </h4>
            {!collapsed && (
              <p className="text-[10px] text-gray-400">
                Poverty Deprivation (%)
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label={collapsed ? "Expand legend" : "Collapse legend"}
          className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transform transition-transform duration-200 ${collapsed ? "rotate-180" : ""
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Content */}
      {!collapsed && (
        <div className="p-3.5 space-y-3">
          {/* Continuous gradient preview bar */}
          <div>
            <div
              className="h-2 w-full rounded-full border border-black/30 shadow-inner"
              style={{
                background:
                  "linear-gradient(to right, #FFF3E0, #FFE0B2, #FFCC80, #FFA726, #FB8C00, #E65100, #BF360C)",
              }}
            />
            <div className="flex justify-between items-center text-[9px] font-semibold text-gray-400 mt-1">
              <span>Low (&lt;5%)</span>
              <span>Nat. Avg 25%</span>
              <span>High (&gt;40%)</span>
            </div>
          </div>

          {/* Discrete Range Steps */}
          <div className="space-y-1.5 pt-1">
            {MPI_CHOROPLETH_RANGES.map((step) => (
              <div
                key={step.label}
                className="flex items-center gap-2.5 text-xs py-0.5 px-1 rounded hover:bg-white/5 transition-colors"
              >
                <span
                  className="w-4 h-3 rounded-[3px] flex-none border border-black/30 shadow-xs"
                  style={{ backgroundColor: step.color }}
                />
                <span className="text-[11px] font-semibold text-gray-200 font-mono">
                  {step.label}
                </span>
              </div>
            ))}

            {hasMissingData && (
              <div className="flex items-center gap-2.5 text-xs py-0.5 px-1 rounded hover:bg-white/5 transition-colors">
                <span
                  className="w-4 h-3 rounded-[3px] flex-none border border-black/30 shadow-xs"
                  style={{ backgroundColor: "#374151" }}
                />
                <span className="text-[11px] font-semibold text-gray-400 font-mono">
                  No data
                </span>
              </div>
            )}
          </div>

          {/* Footer citation & benchmark */}
          <div className="pt-2 border-t border-[#2D3148]/60 flex items-center justify-between text-[9px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="text-orange-400">●</span>
              <span>NITI Aayog & Census</span>
            </span>
            <span className="text-gray-400 font-mono">{totalItemsLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}
