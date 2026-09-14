"use client";

import { useState } from "react";
import Link from "next/link";
import type { DistrictMetrics } from "@/lib/types/district";
import { INDICATOR_CATEGORIES, METRIC_LABELS } from "@/lib/constants";
import {
  getDimensionScores,
  getPriorityAreas,
  getMetricsForYear,
} from "@/lib/ml-utils";

import DistrictFingerprint from "@/components/district/DistrictFingerprint";
import SimilarDistricts from "@/components/district/SimilarDistricts";
import AskYourDistrict from "@/components/district/AskYourDistrict";
import DataExplorer from "@/components/district/DataExplorer";

interface DistrictPageClientProps {
  district: DistrictMetrics;
  allDistricts: DistrictMetrics[];
  stateName: string;
  stateCode: string;
}

// ── Four fixed categories shown as cards in Key Development Dimensions ───────
const DEVELOPMENT_CATEGORIES = [
  { key: "health",    label: "Health & Healthcare Access" },
  { key: "nutrition", label: "Nutrition" },
  { key: "women",     label: "Women & Gender" },
  { key: "education", label: "Education" },
] as const;

export default function DistrictPageClient({
  district,
  allDistricts,
  stateName,
  stateCode,
}: DistrictPageClientProps) {
  const [surveyYear, setSurveyYear] = useState<"NFHS-5" | "NFHS-6">("NFHS-6"); // Default to latest NFHS-6
  const [isAIOpen, setIsAIOpen] = useState(false);

  // Project baseline data dynamically based on the active survey year
  const activeDistrict = getMetricsForYear(district, surveyYear);
  const activeAllDistricts = allDistricts.map(d => getMetricsForYear(d, surveyYear));

  // Core calculations using active year data
  const dimScores = getDimensionScores(activeDistrict);
  const priorities = getPriorityAreas(activeDistrict, activeAllDistricts);

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-gray-200">
      
      {/* Header and State Link */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#2D3148] pb-6">
        <div>
          <div className="text-xs text-orange-400 font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <span>District Intelligence</span>
            <span className="w-1 h-1 rounded-full bg-[#2D3148]" />
            <span>{activeDistrict.metadata.source} · {activeDistrict.metadata.year}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            {activeDistrict.district_name}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            State: <span className="text-white font-medium">{stateName}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center md:items-end">
          {/* Survey Year Selector Tabs */}
          <div className="flex items-center gap-1 bg-[#0F1117] border border-[#2D3148] p-1 rounded-full shadow-inner">
            <button
              onClick={() => setSurveyYear("NFHS-5")}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all cursor-pointer ${
                surveyYear === "NFHS-5"
                  ? "bg-[#1A1D27] text-orange-400 border border-[#2D3148] shadow-sm"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              NFHS-5 (2019-21)
            </button>
            <button
              onClick={() => setSurveyYear("NFHS-6")}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all cursor-pointer ${
                surveyYear === "NFHS-6"
                  ? "bg-[#1A1D27] text-orange-400 border border-[#2D3148] shadow-sm"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              NFHS-6 (2023-24)
            </button>
          </div>

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

      {/* District Fingerprint — Enlarged */}
      <div>
        <DistrictFingerprint district={activeDistrict} />
      </div>

      {/* Key Development Dimensions — 2x2 Category Grid */}
      <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6 md:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold text-white">Key Development Dimensions</h3>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Sectoral performance profiles — compare {activeDistrict.district_name} across core dimensions against state benchmarks.
            </p>
          </div>
          <span className="text-xs text-orange-400/90 font-medium hidden sm:inline-block">
            Click any category to explore detailed indicators →
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {DEVELOPMENT_CATEGORIES.map(({ key, label }) => {
            const score = dimScores[key] ?? 0;
            const catInfo = INDICATOR_CATEGORIES[key as keyof typeof INDICATOR_CATEGORIES];
            const scoreColor =
              score >= 70 ? "#66BB6A" : score >= 50 ? "#FFA726" : "#EF5350";
            const barBg =
              score >= 70 ? "bg-[#66BB6A]" : score >= 50 ? "bg-[#FFA726]" : "bg-[#EF5350]";
            const statusLabel =
              score >= 70 ? "Strong Performance" : score >= 50 ? "Moderate Performance" : "Critical Gap";

            return (
              <Link
                key={key}
                href={`/district/${activeDistrict.district_id}/category/${key}?year=${surveyYear}`}
                className="group relative flex flex-col justify-between p-5 md:p-6 rounded-xl bg-[#0F1117]/80 border border-[#2D3148] hover:border-orange-500/50 hover:bg-[#0F1117] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-200 cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                        {label}
                      </h4>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {catInfo?.indicators.length} tracked indicators
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className="text-2xl md:text-3xl font-extrabold tabular-nums block"
                        style={{ color: scoreColor }}
                      >
                        {score}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        / 100
                      </span>
                    </div>
                  </div>

                  {/* Score bar & Status */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                      <span className="text-gray-400">{statusLabel}</span>
                      <span style={{ color: scoreColor }} className="font-bold tabular-nums">
                        {score}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#2D3148] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barBg}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#2D3148]/60 flex items-center justify-between text-xs text-gray-400 group-hover:text-orange-400 transition-colors">
                  <span className="font-medium">Explore detailed indicators</span>
                  <div className="flex items-center gap-1 font-semibold">
                    <span>Compare</span>
                    <svg className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Peer Comparison */}
      <div>
        <SimilarDistricts district={activeDistrict} allDistricts={activeAllDistricts} />
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

      {/* District Intelligence AI Assistant Prompt Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-[#1A1D27] to-purple-950/20 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-400 text-lg font-black">✦</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                District Intelligence AI Assistant
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-semibold text-emerald-400">
                Data-grounded
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 leading-normal">
              Compare {activeDistrict.district_name} with peer districts across India, benchmark against state averages, or ask detailed indicator questions.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAIOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-500/20 flex-shrink-0"
        >
          <span>✦ Ask AI Assistant</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* Floating District Intelligence AI Chatbot (Fixed at bottom-right) */}
      <AskYourDistrict
        district={activeDistrict}
        allDistricts={activeAllDistricts}
        stateName={stateName}
        stateCode={stateCode}
        surveyYear={surveyYear}
        isOpen={isAIOpen}
        onOpenChange={setIsAIOpen}
      />

      {/* Data Explorer Component */}
      <div>
        <DataExplorer district={activeDistrict} allDistricts={activeAllDistricts} />
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
              <strong className="text-base text-white block mt-1">{activeDistrict.literacy_rate?.toFixed(1)}%</strong>
            </div>
            <div className="p-3 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-gray-500 block">Sex Ratio</span>
              <strong className="text-base text-white block mt-1">
                {activeDistrict.sex_ratio?.toFixed(0)} <span className="text-[9px] font-normal text-gray-500">F / 1,000 M</span>
              </strong>
            </div>
            <div className="p-3 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-gray-500 block">Child Pop. (&lt;15 yrs)</span>
              <strong className="text-base text-white block mt-1">{activeDistrict.child_population_pct?.toFixed(1)}%</strong>
            </div>
            <div className="p-3 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-gray-500 block">Avg. Household Size</span>
              <strong className="text-base text-white block mt-1">{activeDistrict.household_size_avg?.toFixed(1)} persons</strong>
            </div>
          </div>
        </div>

        {/* NFHS Survey Methodology Metadata */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Data & Methodology (Survey Metadata)
          </h3>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Data collected by the Ministry of Health & Family Welfare during the National Family Health Survey ({activeDistrict.metadata.source}). Sample sizes and respondents interviewed:
          </p>
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="p-2.5 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-[10px] text-gray-500 block">Households</span>
              <strong className="text-sm text-orange-400 block mt-1">
                {activeDistrict.households_surveyed?.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="p-2.5 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-[10px] text-gray-500 block">Women (15-49)</span>
              <strong className="text-sm text-orange-400 block mt-1">
                {activeDistrict.women_interviewed?.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="p-2.5 bg-[#0F1117] border border-[#2D3148] rounded-xl">
              <span className="text-[10px] text-gray-500 block">Men (15-54)</span>
              <strong className="text-sm text-orange-400 block mt-1">
                {activeDistrict.men_interviewed?.toLocaleString("en-IN")}
              </strong>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Attribution */}
      <div className="pt-4 text-center text-[10px] text-gray-600">
        Data Sources: Ministry of Health and Family Welfare, Government of India. Fact sheets retrieved from {activeDistrict.metadata.source} publications. For questions, consult the official{" "}
        <a
          href="https://rchiips.org/nfhs/"
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
