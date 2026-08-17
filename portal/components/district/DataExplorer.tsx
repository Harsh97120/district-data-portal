"use client";

import { useState } from "react";
import type { DistrictMetrics } from "@/lib/types/district";
import { METRIC_LABELS, INDICATOR_CATEGORIES } from "@/lib/constants";
import { getStateAverage } from "@/lib/ml-utils";

interface DataExplorerProps {
  district: DistrictMetrics;
  allDistricts: DistrictMetrics[];
}

export default function DataExplorer({ district, allDistricts }: DataExplorerProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const stateAverages = getStateAverage(allDistricts);

  const categories = [
    { key: "all", label: "All Indicators" },
    ...Object.entries(INDICATOR_CATEGORIES).map(([key, info]) => ({
      key,
      label: info.label,
    })),
  ];

  // Filter indicators
  const filteredMetrics = Object.entries(METRIC_LABELS).filter(([field, meta]) => {
    // Skip households surveyed/women/men interviewed if we only want insights
    // Actually we keep them in explorer since explorer = "all available raw data"
    
    // Category filter
    if (selectedCategory !== "all") {
      const catInfo = INDICATOR_CATEGORIES[selectedCategory as keyof typeof INDICATOR_CATEGORIES];
      if (catInfo && !(catInfo.indicators as readonly string[]).includes(field)) {
        return false;
      }
    }

    // Search filter
    if (search.trim() !== "") {
      const s = search.toLowerCase();
      const nameMatch = meta.label.toLowerCase().includes(s);
      const descMatch = meta.description.toLowerCase().includes(s);
      return nameMatch || descMatch;
    }

    return true;
  });

  const getCategoryBadge = (field: string) => {
    for (const [catKey, catInfo] of Object.entries(INDICATOR_CATEGORIES)) {
      if ((catInfo.indicators as readonly string[]).includes(field)) {
        return (
          <span className="text-[10px] bg-[#0F1117] border border-[#2D3148] px-2 py-0.5 rounded-full text-gray-400 capitalize">
            {catKey.replace("_", " ")}
          </span>
        );
      }
    }
    return (
      <span className="text-[10px] bg-[#0F1117] border border-[#2D3148] px-2 py-0.5 rounded-full text-gray-500">
        Demographics
      </span>
    );
  };

  return (
    <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Data Explorer</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Browse and search all available indicators, raw values, and state averages
          </p>
        </div>
        
        {/* Search bar */}
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search indicators..."
            className="w-full rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:outline-none text-xs text-white px-3 py-2"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#2D3148] pb-4 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === cat.key
                ? "bg-orange-500/10 border border-orange-500/30 text-orange-400"
                : "bg-transparent text-gray-400 border border-transparent hover:text-white"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Warning on Data Freshness */}
      <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-400 flex items-start gap-2 leading-relaxed">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <span className="font-semibold">Data Freshness Alert:</span> Indicators are from the <strong>NFHS-5 (2019-21)</strong> survey period. Always verify the period beside each indicator when comparing datasets.
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-[#2D3148] rounded-xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-[#2D3148] bg-[#0F1117]/50 text-gray-400 uppercase tracking-wider font-semibold">
              <th className="px-4 py-3">Indicator</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">District Value</th>
              <th className="px-4 py-3 text-right">State Average</th>
              <th className="px-4 py-3 text-center">Period / Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2D3148]">
            {filteredMetrics.map(([field, meta]) => {
              const val = district[field as keyof DistrictMetrics];
              const value = typeof val === "number" ? val : null;
              
              const stateAvg = stateAverages[field];
              const gap = value !== null && stateAvg !== undefined ? value - stateAvg : 0;
              const better = meta.direction === "positive" ? gap > 0 : gap < 0;

              return (
                <tr key={field} className="hover:bg-[#242838]/30 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-white font-medium">{meta.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{meta.description}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getCategoryBadge(field)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap">
                    {value !== null ? (
                      <span className="tabular-nums">
                        {value.toFixed(1)}
                        <span className="text-[10px] text-gray-500 ml-0.5">{meta.unit}</span>
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-400 whitespace-nowrap">
                    {stateAvg !== undefined ? (
                      <span className="tabular-nums">
                        {stateAvg.toFixed(1)}
                        <span className="text-[10px] text-gray-600 ml-0.5">{meta.unit}</span>
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-[10px] text-gray-500 whitespace-nowrap">
                    <span className="block font-medium text-gray-400">{district.metadata.year}</span>
                    <span className="block text-[9px]">{district.metadata.source}</span>
                  </td>
                </tr>
              );
            })}
            
            {filteredMetrics.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No indicators match your search. Try adjusting the filter or search text.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
