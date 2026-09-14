"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DistrictMetrics } from "@/lib/types/district";
import { INDICATOR_CATEGORIES, METRIC_LABELS } from "@/lib/constants";
import { getDimensionScores, getMetricsForYear } from "@/lib/ml-utils";
import Breadcrumb from "@/components/ui/Breadcrumb";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

type CategoryKey = "health" | "nutrition" | "women" | "education";

interface CategoryConfig {
  label: string;
  description: string;
  accentColor: string;
  gradientFrom: string;
}

// ── Category Configuration ─────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  health: {
    label: "Health & Healthcare Access",
    description: "Maternal care, child vaccination, disease screening and insurance coverage",
    accentColor: "#38BDF8",
    gradientFrom: "rgba(56,189,248,0.08)",
  },
  nutrition: {
    label: "Nutrition",
    description: "Child malnutrition, anaemia prevalence, breastfeeding and dietary practices",
    accentColor: "#34D399",
    gradientFrom: "rgba(52,211,153,0.08)",
  },
  women: {
    label: "Women & Gender",
    description: "Women education, empowerment, reproductive autonomy and financial inclusion",
    accentColor: "#A78BFA",
    gradientFrom: "rgba(167,139,250,0.08)",
  },
  education: {
    label: "Education",
    description: "Literacy rates, school attendance, learning outcomes and student retention",
    accentColor: "#FB923C",
    gradientFrom: "rgba(251,146,60,0.08)",
  },
};

const ALL_CATEGORIES: CategoryKey[] = ["health", "nutrition", "women", "education"];

// ── Props ──────────────────────────────────────────────────────────────────

interface CategoryDetailClientProps {
  district: DistrictMetrics;
  allDistricts: DistrictMetrics[];
  categoryKey: CategoryKey;
  stateName: string;
  stateCode: string;
  districtId: string;
  defaultYear?: "NFHS-5" | "NFHS-6";
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CategoryDetailClient({
  district,
  allDistricts,
  categoryKey,
  stateName,
  stateCode,
  districtId,
  defaultYear = "NFHS-6",
}: CategoryDetailClientProps) {
  const [surveyYear, setSurveyYear] = useState<"NFHS-5" | "NFHS-6">(defaultYear);

  // ── Active data based on survey year ──────────────────────────────────────
  const activeDistrict = useMemo(
    () => getMetricsForYear(district, surveyYear),
    [district, surveyYear]
  );
  const activeAllDistricts = useMemo(
    () => allDistricts.map((d) => getMetricsForYear(d, surveyYear)),
    [allDistricts, surveyYear]
  );

  const config = CATEGORY_CONFIG[categoryKey];
  const catInfo = INDICATOR_CATEGORIES[categoryKey as keyof typeof INDICATOR_CATEGORIES];

  // ── State average per indicator ────────────────────────────────────────────
  const stateAvgMap = useMemo<Record<string, number | null>>(() => {
    const map: Record<string, number | null> = {};
    for (const field of catInfo.indicators) {
      const values = activeAllDistricts
        .map((d) => d[field as keyof DistrictMetrics])
        .filter((v): v is number => typeof v === "number");
      map[field] =
        values.length > 0
          ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
          : null;
    }
    return map;
  }, [activeAllDistricts, catInfo.indicators]);

  // ── Composite dimension scores ─────────────────────────────────────────────
  const districtDimScores = useMemo(() => getDimensionScores(activeDistrict), [activeDistrict]);
  const districtCatScore = districtDimScores[categoryKey] ?? 0;

  const stateCatScore = useMemo(() => {
    const scores = activeAllDistricts.map((d) => getDimensionScores(d)[categoryKey] ?? 0);
    return scores.length > 0
      ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
      : 0;
  }, [activeAllDistricts, categoryKey]);

  const scoreDiff = parseFloat((districtCatScore - stateCatScore).toFixed(1));
  const scoreColor =
    districtCatScore >= 70 ? "#66BB6A" : districtCatScore >= 50 ? "#FFA726" : "#EF5350";

  // ── Selected indicator state for single-indicator overview ───────────────────
  const [selectedField, setSelectedField] = useState<string>(catInfo.indicators[0] || "");
  const activeField = catInfo.indicators.includes(selectedField)
    ? selectedField
    : catInfo.indicators[0];

  const selectedMeta = METRIC_LABELS[activeField];
  const selectedDistrictVal = activeDistrict[activeField as keyof DistrictMetrics] as number | null;
  const selectedStateAvg = stateAvgMap[activeField] ?? null;
  const unit = selectedMeta?.unit ?? "%";
  const isNegative = selectedMeta?.direction === "negative";

  const isDistrictBetter =
    selectedDistrictVal !== null && selectedStateAvg !== null
      ? !isNegative
        ? selectedDistrictVal >= selectedStateAvg
        : selectedDistrictVal <= selectedStateAvg
      : null;

  const rawDelta =
    selectedDistrictVal !== null && selectedStateAvg !== null
      ? parseFloat((selectedDistrictVal - selectedStateAvg).toFixed(1))
      : null;

  const perfColor =
    isDistrictBetter === null
      ? "#6B7280"
      : isDistrictBetter
      ? "#66BB6A"
      : "#EF5350";

  const singleIndicatorChartData = useMemo(
    () => [
      {
        name: activeDistrict.district_name,
        value: selectedDistrictVal ?? 0,
        formattedVal: selectedDistrictVal !== null ? `${selectedDistrictVal.toFixed(1)}${unit}` : "—",
        role: "Selected District",
        fill: "#F97316",
      },
      {
        name: `${stateName} Average`,
        value: selectedStateAvg ?? 0,
        formattedVal: selectedStateAvg !== null ? `${selectedStateAvg.toFixed(1)}${unit}` : "—",
        role: "State Benchmark",
        fill: "#64748B",
      },
    ],
    [activeDistrict.district_name, selectedDistrictVal, stateName, selectedStateAvg, unit]
  );

  const yDomainMax = Math.max(
    100,
    Math.ceil(((selectedDistrictVal ?? 0) + 10) / 10) * 10,
    Math.ceil(((selectedStateAvg ?? 0) + 10) / 10) * 10
  );

  const SingleIndicatorTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: (typeof singleIndicatorChartData)[0]; value: number }[];
  }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-[#1A1D27] border border-[#2D3148] rounded-xl p-3 shadow-2xl text-xs">
        <p className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">{item.role}</p>
        <p className="text-white font-bold text-sm mt-0.5">{item.name}</p>
        <p className="text-orange-400 font-extrabold text-lg mt-1 tabular-nums">
          {item.formattedVal}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-gray-200">
      {/* ── Breadcrumb + Page Header ────────────────────────────────────────── */}
      <div>
        <Breadcrumb
          items={[
            { label: "India", href: "/" },
            { label: stateName, href: `/state/${stateCode}` },
            { label: activeDistrict.district_name, href: `/district/${districtId}` },
            { label: config.label },
          ]}
        />

        <div className="mt-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2"
              style={{ color: config.accentColor }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.accentColor }} />
              <span>Category Deep-Dive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {config.label}
            </h1>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">{config.description}</p>
            <p className="text-xs text-orange-400 font-semibold mt-1.5">
              {activeDistrict.district_name} &middot; {stateName}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Survey Year Toggle */}
            <div className="flex items-center gap-1 bg-[#0F1117] border border-[#2D3148] p-1 rounded-full shadow-inner">
              {(["NFHS-5", "NFHS-6"] as const).map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSurveyYear(yr)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all cursor-pointer ${
                    surveyYear === yr
                      ? "bg-[#1A1D27] text-orange-400 border border-[#2D3148] shadow-sm"
                      : "text-gray-500 hover:text-gray-300 border border-transparent"
                  }`}
                >
                  {yr === "NFHS-5" ? "NFHS-5 (2019-21)" : "NFHS-6 (2023-24)"}
                </button>
              ))}
            </div>

            <Link
              href={`/district/${districtId}`}
              className="px-4 py-2 rounded-full bg-[#1A1D27] border border-[#2D3148] text-xs text-gray-300 hover:text-white hover:border-orange-500/40 font-semibold flex items-center gap-1.5 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Full Report
            </Link>
          </div>
        </div>
      </div>

      {/* ── Score Hero: District vs State ──────────────────────────────────── */}
      <div
        className="rounded-2xl border border-[#2D3148] p-6 sm:p-8"
        style={{
          background: `linear-gradient(135deg, ${config.gradientFrom} 0%, #1A1D27 60%)`,
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          {/* District Score */}
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">
              {activeDistrict.district_name}
            </p>
            <p
              className="text-6xl font-extrabold tabular-nums leading-none"
              style={{ color: scoreColor }}
            >
              {districtCatScore}
            </p>
            <p className="text-[10px] text-gray-500 mt-1.5 font-semibold">Score / 100</p>
            <div className="mt-4 mx-6 h-2 rounded-full bg-[#2D3148] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${districtCatScore}%`, backgroundColor: scoreColor }}
              />
            </div>
          </div>

          {/* Delta */}
          <div className="flex flex-col items-center gap-3">
            <div
              className={`px-5 py-3 rounded-2xl border text-center ${
                scoreDiff > 0
                  ? "bg-[#66BB6A]/10 border-[#66BB6A]/30"
                  : scoreDiff < 0
                  ? "bg-[#EF5350]/10 border-[#EF5350]/30"
                  : "bg-[#2D3148]/40 border-[#2D3148]"
              }`}
            >
              <p
                className="text-2xl font-extrabold tabular-nums"
                style={{
                  color: scoreDiff > 0 ? "#66BB6A" : scoreDiff < 0 ? "#EF5350" : "#9CA3AF",
                }}
              >
                {scoreDiff > 0 ? "+" : ""}
                {scoreDiff}
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                Points vs State Avg
              </p>
            </div>
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              {scoreDiff > 0
                ? `${activeDistrict.district_name} outperforms the state average`
                : scoreDiff < 0
                ? `${activeDistrict.district_name} lags behind the state average`
                : "Matches the state average exactly"}
            </p>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: scoreColor }}
                />
                <span className="text-gray-400">{activeDistrict.district_name}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" />
                <span className="text-gray-400">State Avg</span>
              </span>
            </div>
          </div>

          {/* State Average Score */}
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">
              {stateName} Average
            </p>
            <p className="text-6xl font-extrabold tabular-nums text-gray-400 leading-none">
              {stateCatScore}
            </p>
            <p className="text-[10px] text-gray-500 mt-1.5 font-semibold">Score / 100</p>
            <div className="mt-4 mx-6 h-2 rounded-full bg-[#2D3148] overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-500 transition-all duration-700"
                style={{ width: `${stateCatScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Indicator Overview (Dropdown + Single-Indicator Dynamic Comparison) ── */}
      <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6 md:p-8 space-y-6">
        {/* Section Header with Indicator Dropdown */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#2D3148]">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg md:text-xl font-bold text-white">Indicator Overview</h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold uppercase tracking-wider">
                {catInfo.indicators.length} Tracked Fields
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Select an indicator to inspect how {activeDistrict.district_name} compares with {stateName} benchmarks.
            </p>
          </div>

          {/* Indicator Dropdown Menu */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-shrink-0">
            <label htmlFor="indicator-select" className="text-xs text-gray-400 font-semibold whitespace-nowrap">
              Select Indicator:
            </label>
            <div className="relative min-w-[260px] sm:min-w-[320px]">
              <select
                id="indicator-select"
                value={activeField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full appearance-none bg-[#0F1117] text-white text-xs font-semibold pl-4 pr-10 py-3 rounded-xl border border-[#2D3148] hover:border-orange-500/50 focus:border-orange-500 focus:outline-none transition-all cursor-pointer shadow-lg shadow-black/20"
              >
                {catInfo.indicators.map((field) => {
                  const meta = METRIC_LABELS[field];
                  return (
                    <option key={field} value={field} className="bg-[#1A1D27] text-white py-1">
                      {meta?.label || field}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-orange-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Indicator Description & Delta Banner */}
        <div className="p-4 md:p-5 rounded-xl bg-[#0F1117]/80 border border-[#2D3148] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-base sm:text-lg font-bold text-white">
                {selectedMeta?.label || activeField}
              </span>
              {isNegative ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-wider">
                  ⚠ Lower = Better outcome
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  Higher = Better outcome
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">
              {selectedMeta?.description || "Verified NFHS survey indicator data."}
            </p>
          </div>

          {rawDelta !== null && (
            <div
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-center border"
              style={{
                color: perfColor,
                backgroundColor: `${perfColor}15`,
                borderColor: `${perfColor}35`,
              }}
            >
              <span className="text-lg font-extrabold tabular-nums block">
                {rawDelta > 0 ? "+" : ""}{rawDelta}{unit}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {isDistrictBetter ? "Outperforming State" : "Lagging State Avg"}
              </span>
            </div>
          )}
        </div>

        {/* Comparison Graph & Side Comparison Metric Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Main Comparison Bar Chart */}
          <div className="lg:col-span-7 bg-[#0F1117]/60 border border-[#2D3148] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                District vs State Benchmark
              </h3>
              <span className="text-[10px] text-gray-500 font-semibold">
                Unit: {unit}
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={singleIndicatorChartData}
                  margin={{ top: 20, right: 24, left: 0, bottom: 20 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2D3148"
                    vertical={false}
                    horizontal={true}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#D1D5DB", fontSize: 12, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2D3148" }}
                  />
                  <YAxis
                    domain={[0, yDomainMax]}
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}${unit}`}
                  />
                  <Tooltip content={<SingleIndicatorTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={64}
                  >
                    {singleIndicatorChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-400 border-t border-[#2D3148]/50 pt-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#F97316]" />
                <span className="text-white font-medium">{activeDistrict.district_name}</span>
                <span className="text-orange-400 font-bold tabular-nums">
                  ({selectedDistrictVal !== null ? `${selectedDistrictVal.toFixed(1)}${unit}` : "—"})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#64748B]" />
                <span>{stateName} Benchmark</span>
                <span className="text-gray-300 font-bold tabular-nums">
                  ({selectedStateAvg !== null ? `${selectedStateAvg.toFixed(1)}${unit}` : "—"})
                </span>
              </div>
            </div>
          </div>

          {/* Side Comparison Cards */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Selected District Card */}
            <div className="p-4 rounded-xl bg-[#0F1117]/80 border border-[#F97316]/30 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400">
                    Selected District
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">{activeDistrict.district_name}</h4>
                </div>
                <span className="text-3xl font-black text-orange-400 tabular-nums">
                  {selectedDistrictVal !== null ? `${selectedDistrictVal.toFixed(1)}${unit}` : "—"}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#2D3148] overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, selectedDistrictVal ?? 0))}%` }}
                />
              </div>
            </div>

            {/* State Benchmark Card */}
            <div className="p-4 rounded-xl bg-[#0F1117]/80 border border-[#2D3148] relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    State Benchmark
                  </span>
                  <h4 className="text-base font-bold text-gray-200 mt-0.5">{stateName} Average</h4>
                </div>
                <span className="text-3xl font-black text-gray-300 tabular-nums">
                  {selectedStateAvg !== null ? `${selectedStateAvg.toFixed(1)}${unit}` : "—"}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#2D3148] overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-gray-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, selectedStateAvg ?? 0))}%` }}
                />
              </div>
            </div>

            {/* Comparison Analysis Card */}
            <div className="p-4 rounded-xl bg-[#0F1117]/50 border border-[#2D3148] text-xs space-y-2">
              <div className="flex items-center justify-between text-gray-300 font-semibold">
                <span>Comparative Summary</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{
                    color: perfColor,
                    backgroundColor: `${perfColor}15`,
                  }}
                >
                  {isDistrictBetter ? "Advantage" : "Lagging"}
                </span>
              </div>
              <p className="text-gray-400 leading-relaxed text-[11px]">
                {isDistrictBetter === null
                  ? "Benchmark data is not available for this indicator."
                  : isDistrictBetter
                  ? `${activeDistrict.district_name} outperforms the state average by ${Math.abs(rawDelta ?? 0)}${unit}.`
                  : `${activeDistrict.district_name} trails the state average by ${Math.abs(rawDelta ?? 0)}${unit}.`}
                {isNegative
                  ? " As a negative metric, lower rates indicate healthier or more desirable outcomes."
                  : " As a positive coverage metric, higher percentages denote broader reach and progress."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Navigation ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-[#2D3148]">
        {/* Other category shortcuts */}
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">
            Explore other categories
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.filter((k) => k !== categoryKey).map((k) => {
              const conf = CATEGORY_CONFIG[k];
              return (
                <Link
                  key={k}
                  href={`/district/${districtId}/category/${k}?year=${surveyYear}`}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0F1117] border border-[#2D3148] text-xs text-gray-400 hover:text-white hover:border-[#3D4168] transition-all font-medium flex items-center"
                >
                  <span>{conf.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <Link
          href={`/district/${districtId}`}
          className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-orange-500/20 flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Full District Report
        </Link>
      </div>
    </div>
  );
}