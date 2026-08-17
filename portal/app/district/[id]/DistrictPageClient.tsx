"use client";

import { useState } from "react";
import Link from "next/link";
import type { DistrictMetrics } from "@/lib/types/district";
import { INDICATOR_CATEGORIES, METRIC_LABELS } from "@/lib/constants";
import {
  getDimensionScores,
  getPriorityAreas,
  runKMeansClustering,
  checkDevelopmentParadoxes,
} from "@/lib/ml-utils";

import DistrictFingerprint from "@/components/district/DistrictFingerprint";
import SimilarDistricts from "@/components/district/SimilarDistricts";
import DevelopmentParadox from "@/components/district/DevelopmentParadox";
import AskYourDistrict from "@/components/district/AskYourDistrict";
import DataExplorer from "@/components/district/DataExplorer";

interface DistrictPageClientProps {
  district: DistrictMetrics;
  allDistricts: DistrictMetrics[];
  stateName: string;
  stateCode: string;
}

export default function DistrictPageClient({
  district,
  allDistricts,
  stateName,
  stateCode,
}: DistrictPageClientProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Core calculations
  const dimScores = getDimensionScores(district);
  const priorities = getPriorityAreas(district, allDistricts);
  const paradoxes = checkDevelopmentParadoxes(district);
  
  // Find clustering profile
  const clusters = runKMeansClustering(allDistricts, 4);
  const myCluster = clusters.find((c) =>
    c.districts.some((d) => d.district_id === district.district_id)
  );
  const clusterLabel = myCluster ? myCluster.label : "Moderate Development Profile";

  // Dynamic Grounded AI Summary
  const topStrengthCat = Object.entries(dimScores).sort((a, b) => b[1] - a[1])[0];
  const topGapCat = Object.entries(dimScores).sort((a, b) => a[1] - b[1])[0];
  
  const generateAISummary = () => {
    const strengthName = INDICATOR_CATEGORIES[topStrengthCat[0] as keyof typeof INDICATOR_CATEGORIES]?.label;
    const gapName = INDICATOR_CATEGORIES[topGapCat[0] as keyof typeof INDICATOR_CATEGORIES]?.label;
    
    let paradoxText = "";
    if (paradoxes.length > 0) {
      paradoxText = ` Analysis highlights an ${paradoxes[0].title}: basic infrastructure is strong, but child nutrition remains a bottleneck.`;
    }

    return `${district.district_name} is classified under the "${clusterLabel}" development profile in ${stateName}. Its strongest dimension is "${strengthName}" (Score: ${topStrengthCat[1]}/100), while the most significant developmental lag is in "${gapName}" (Score: ${topGapCat[1]}/100).${paradoxText} Key areas needing immediate programmatic focus include ${priorities[0].label.toLowerCase()} and ${priorities[1].label.toLowerCase()}.`;
  };

  const formatRawValue = (field: string, val: number | null) => {
    if (val === null) return "—";
    const meta = METRIC_LABELS[field];
    return `${val.toFixed(1)}${meta?.unit || "%"}`;
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-gray-200">
      
      {/* Header and State Link */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#2D3148] pb-6">
        <div>
          <div className="text-xs text-orange-400 font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <span>District Intelligence</span>
            <span className="w-1 h-1 rounded-full bg-[#2D3148]" />
            <span>{district.metadata.source} · {district.metadata.year}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            {district.district_name}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            State: <span className="text-white font-medium">{stateName}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Link
            href={`/state/${stateCode}`}
            className="px-4 py-2 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-orange-500/5"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to {stateName} Map
          </Link>
        </div>
      </div>

      {/* AI Summary Block */}
      <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/35 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3">
          <span className="text-[9px] uppercase tracking-widest font-extrabold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
            AI Summary
          </span>
        </div>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div className="space-y-1">
            <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">AI Insights & Overview</p>
            <p className="text-sm text-purple-100 leading-relaxed font-medium">
              {generateAISummary()}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Fingerprint & Strengths/Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* District Fingerprint Radar Chart (Left 7 Columns) */}
        <div className="lg:col-span-7">
          <DistrictFingerprint district={district} />
        </div>

        {/* Strengths & Gaps Accordion Drill-down (Right 5 Columns) */}
        <div className="lg:col-span-5 bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Strengths & Gaps</h3>
            <p className="text-xs text-gray-500 mb-5 leading-normal">
              Click a dimension card to expand and view its supporting verified indicators
            </p>

            <div className="space-y-4">
              {/* Top Strengths */}
              <div>
                <h4 className="text-xs font-semibold text-[#66BB6A] uppercase tracking-wider mb-2">
                  Top Strengths
                </h4>
                {Object.entries(dimScores)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 2)
                  .map(([key, score]) => {
                    const info = INDICATOR_CATEGORIES[key as keyof typeof INDICATOR_CATEGORIES];
                    const isExpanded = expandedSection === `strength-${key}`;
                    return (
                      <div
                        key={key}
                        className="mb-2 border border-[#2D3148] rounded-xl overflow-hidden bg-[#0F1117]/50"
                      >
                        <button
                          onClick={() => setExpandedSection(isExpanded ? null : `strength-${key}`)}
                          className="w-full flex items-center justify-between p-3.5 hover:bg-[#242838]/40 transition-colors text-left"
                        >
                          <div>
                            <span className="text-xs font-semibold text-white">{info?.label}</span>
                            <span className="block text-[10px] text-gray-500 mt-0.5">
                              {info?.indicators.length} indicators contributing
                            </span>
                          </div>
                          <span className="text-sm font-bold text-[#66BB6A]">{score}</span>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 pt-1 border-t border-[#2D3148] divide-y divide-[#2D3148]/60 bg-[#0F1117]/90 animate-fade-in text-[11px]">
                            {info?.indicators.map((field) => (
                              <div key={field} className="py-2 flex justify-between gap-4">
                                <span className="text-gray-400 font-medium">
                                  {METRIC_LABELS[field]?.label}
                                </span>
                                <span className="text-[#66BB6A] font-semibold whitespace-nowrap">
                                  {formatRawValue(field, district[field as keyof DistrictMetrics] as number | null)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Development Gaps */}
              <div>
                <h4 className="text-xs font-semibold text-[#FFA726] uppercase tracking-wider mb-2">
                  Development Gaps
                </h4>
                {Object.entries(dimScores)
                  .sort((a, b) => a[1] - b[1])
                  .slice(0, 2)
                  .map(([key, score]) => {
                    const info = INDICATOR_CATEGORIES[key as keyof typeof INDICATOR_CATEGORIES];
                    const isExpanded = expandedSection === `gap-${key}`;
                    return (
                      <div
                        key={key}
                        className="mb-2 border border-[#2D3148] rounded-xl overflow-hidden bg-[#0F1117]/50"
                      >
                        <button
                          onClick={() => setExpandedSection(isExpanded ? null : `gap-${key}`)}
                          className="w-full flex items-center justify-between p-3.5 hover:bg-[#242838]/40 transition-colors text-left"
                        >
                          <div>
                            <span className="text-xs font-semibold text-white">{info?.label}</span>
                            <span className="block text-[10px] text-gray-500 mt-0.5">
                              {info?.indicators.length} indicators contributing
                            </span>
                          </div>
                          <span className="text-sm font-bold text-[#EF5350]">{score}</span>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 pt-1 border-t border-[#2D3148] divide-y divide-[#2D3148]/60 bg-[#0F1117]/90 animate-fade-in text-[11px]">
                            {info?.indicators.map((field) => (
                              <div key={field} className="py-2 flex justify-between gap-4">
                                <span className="text-gray-400 font-medium">
                                  {METRIC_LABELS[field]?.label}
                                </span>
                                <span className="text-[#EF5350] font-semibold whitespace-nowrap">
                                  {formatRawValue(field, district[field as keyof DistrictMetrics] as number | null)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Paradox & Outliers */}
      <div>
        <DevelopmentParadox district={district} allDistricts={allDistricts} />
      </div>

      {/* Peer Comparison */}
      <div>
        <SimilarDistricts district={district} allDistricts={allDistricts} />
      </div>

      {/* Priority Engine ranking */}
      <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white">Priority Areas for Reform</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Transparent severity-based engine ranking: &quot;What should be improved first?&quot;
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {priorities.slice(0, 3).map((item, idx) => {
            const meta = METRIC_LABELS[item.field];
            
            // Color tag based on rank
            const rankColors = [
              "bg-[#EF5350]/15 text-[#EF5350] border-[#EF5350]/30", // Red (Rank 1)
              "bg-[#FFA726]/15 text-[#FFA726] border-[#FFA726]/30", // Orange (Rank 2)
              "bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30", // Yellow (Rank 3)
            ];

            return (
              <div
                key={item.field}
                className="p-4 rounded-xl bg-[#0F1117]/60 border border-[#2D3148] flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded border ${rankColors[idx]}`}>
                      Priority Rank {idx + 1}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold tabular-nums">
                      Score: {item.priorityScore.toFixed(0)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-3 leading-snug">
                    {item.label}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-normal font-medium">
                    {item.reason}
                  </p>
                </div>

                <div className="border-t border-[#2D3148]/60 pt-3 flex justify-between items-baseline gap-2">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Value</p>
                    <span className="text-base font-bold text-white tabular-nums">
                      {item.value.toFixed(1)}
                      <span className="text-[10px] text-gray-500 ml-0.5">{meta?.unit}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">State Avg</p>
                    <span className="text-xs font-bold text-gray-400 tabular-nums">
                      {item.stateAverage.toFixed(1)}
                      <span className="text-[10px] text-gray-600 ml-0.5">{meta?.unit}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ask Your District (AI chat component) */}
      <div>
        <AskYourDistrict district={district} allDistricts={allDistricts} />
      </div>

      {/* Data Explorer Component */}
      <div>
        <DataExplorer district={district} allDistricts={allDistricts} />
      </div>

      {/* Context, Demographics & Methodology metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6">
        
        {/* District Context / Demographics */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            District Profile & Context
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-gray-500 block">Female Literacy</span>
              <strong className="text-base text-white block mt-1">{district.literacy_rate?.toFixed(1)}%</strong>
            </div>
            <div className="p-3 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-gray-500 block">Sex Ratio</span>
              <strong className="text-base text-white block mt-1">
                {district.sex_ratio?.toFixed(0)} <span className="text-[9px] font-normal text-gray-500">F / 1,000 M</span>
              </strong>
            </div>
            <div className="p-3 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-gray-500 block">Child Pop. (&lt;15 yrs)</span>
              <strong className="text-base text-white block mt-1">{district.child_population_pct?.toFixed(1)}%</strong>
            </div>
            <div className="p-3 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-gray-500 block">Avg. Household Size</span>
              <strong className="text-base text-white block mt-1">{district.household_size_avg?.toFixed(1)} persons</strong>
            </div>
          </div>
        </div>

        {/* NFHS Survey Methodology Metadata */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Data & Methodology (Survey Metadata)
          </h3>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Data collected by the Ministry of Health & Family Welfare during the National Family Health Survey (NFHS-5). Sample sizes and respondents interviewed:
          </p>
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="p-2.5 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-[10px] text-gray-500 block">Households</span>
              <strong className="text-sm text-orange-400 block mt-1">
                {district.households_surveyed?.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="p-2.5 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-[10px] text-gray-500 block">Women (15-49)</span>
              <strong className="text-sm text-orange-400 block mt-1">
                {district.women_interviewed?.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="p-2.5 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-[10px] text-gray-500 block">Men (15-54)</span>
              <strong className="text-sm text-orange-400 block mt-1">
                {district.men_interviewed?.toLocaleString("en-IN")}
              </strong>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Attribution */}
      <div className="pt-4 text-center text-[10px] text-gray-600">
        Data Sources: Ministry of Health and Family Welfare, Government of India. Fact sheets retrieved from NFHS-5 publications. For questions, consult the official{" "}
        <a
          href="https://rchiips.org/nfhs/nfhs5.shtml"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400/80 hover:underline"
        >
          NFHS Portal
        </a>.
      </div>

    </div>
  );
}
