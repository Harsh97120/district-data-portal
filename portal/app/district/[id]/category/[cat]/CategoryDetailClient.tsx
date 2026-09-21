"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import type { DistrictMetrics } from "@/lib/types/district";
import { INDICATOR_CATEGORIES, METRIC_LABELS } from "@/lib/constants";
import { getDimensionScores, getMetricsForYear } from "@/lib/ml-utils";
import { logActivity } from "@/lib/activity-logger";
import Breadcrumb from "@/components/ui/Breadcrumb";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

type CategoryKey = "health" | "nutrition" | "women" | "education";

interface BenchmarkChartItem {
  category: string;
  district?: number;
  stateAvg?: number;
  districtFormatted?: string;
  stateAvgFormatted?: string;
  nfhs5?: number;
  nfhs6?: number;
  nfhs5Formatted?: string;
  nfhs6Formatted?: string;
}

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
}: CategoryDetailClientProps) {
  // ── Baseline NFHS-5 and Latest NFHS-6 Datasets ───────────────────────────
  const districtNFHS5 = useMemo(() => getMetricsForYear(district, "NFHS-5"), [district]);
  const districtNFHS6 = useMemo(() => getMetricsForYear(district, "NFHS-6"), [district]);

  const allDistrictsNFHS5 = useMemo(
    () => allDistricts.map((d) => getMetricsForYear(d, "NFHS-5")),
    [allDistricts]
  );
  const allDistrictsNFHS6 = useMemo(
    () => allDistricts.map((d) => getMetricsForYear(d, "NFHS-6")),
    [allDistricts]
  );

  // Active district for score hero (latest NFHS-6 status)
  const activeDistrict = districtNFHS6;
  const activeAllDistricts = allDistrictsNFHS6;

  const config = CATEGORY_CONFIG[categoryKey];
  const catInfo = INDICATOR_CATEGORIES[categoryKey as keyof typeof INDICATOR_CATEGORIES];

  // ── Composite dimension scores (NFHS-6 Latest) ───────────────────────────
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
  const [chartGrouping, setChartGrouping] = useState<"period" | "entity">("period");

  const activeField = (catInfo.indicators as readonly string[]).includes(selectedField)
    ? selectedField
    : catInfo.indicators[0];

  const selectedMeta = METRIC_LABELS[activeField];
  const unit = selectedMeta?.unit ?? "%";
  const isNegative = selectedMeta?.direction === "negative";

  // Restore indicator selection from URL query if navigated from My Activity
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const ind = sp.get("indicator");
      if (ind && (catInfo.indicators as readonly string[]).includes(ind)) {
        setSelectedField(ind);
      }
    }
  }, [catInfo.indicators]);

  // Log INDICATOR_VIEW activity asynchronously for authenticated users
  useEffect(() => {
    if (activeField && districtId) {
      logActivity({
        actionType: "INDICATOR_VIEW",
        districtId,
        districtName: district.district_name,
        stateName,
        stateCode,
        indicatorId: activeField,
        indicatorLabel: selectedMeta?.label,
        category: categoryKey,
        dataset: "NFHS-6",
      });
    }
  }, [activeField, districtId, district.district_name, stateName, stateCode, categoryKey, selectedMeta?.label]);

  const districtVal5 = districtNFHS5[activeField as keyof DistrictMetrics] as number | null;
  const districtVal6 = districtNFHS6[activeField as keyof DistrictMetrics] as number | null;

  const stateAvg5 = useMemo(() => {
    const values = allDistrictsNFHS5
      .map((d) => d[activeField as keyof DistrictMetrics])
      .filter((v): v is number => typeof v === "number");
    return values.length > 0
      ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
      : null;
  }, [allDistrictsNFHS5, activeField]);

  const stateAvg6 = useMemo(() => {
    const values = allDistrictsNFHS6
      .map((d) => d[activeField as keyof DistrictMetrics])
      .filter((v): v is number => typeof v === "number");
    return values.length > 0
      ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
      : null;
  }, [allDistrictsNFHS6, activeField]);

  const districtChange =
    districtVal5 !== null && districtVal6 !== null
      ? parseFloat((districtVal6 - districtVal5).toFixed(1))
      : null;

  const stateChange =
    stateAvg5 !== null && stateAvg6 !== null
      ? parseFloat((stateAvg6 - stateAvg5).toFixed(1))
      : null;

  // Chart data grouped by Survey Period: NFHS-5 (2019–21) and NFHS-6 (2023–24)
  const periodChartData = useMemo<BenchmarkChartItem[]>(
    () => [
      {
        category: "NFHS-5 (2019–21)",
        district: districtVal5 ?? 0,
        stateAvg: stateAvg5 ?? 0,
        districtFormatted: districtVal5 !== null ? `${districtVal5.toFixed(1)}${unit}` : "—",
        stateAvgFormatted: stateAvg5 !== null ? `${stateAvg5.toFixed(1)}${unit}` : "—",
      },
      {
        category: "NFHS-6 (2023–24)",
        district: districtVal6 ?? 0,
        stateAvg: stateAvg6 ?? 0,
        districtFormatted: districtVal6 !== null ? `${districtVal6.toFixed(1)}${unit}` : "—",
        stateAvgFormatted: stateAvg6 !== null ? `${stateAvg6.toFixed(1)}${unit}` : "—",
      },
    ],
    [districtVal5, districtVal6, stateAvg5, stateAvg6, unit]
  );

  // Chart data grouped by Entity: Selected District vs State Benchmark
  const entityChartData = useMemo<BenchmarkChartItem[]>(
    () => [
      {
        category: activeDistrict.district_name,
        nfhs5: districtVal5 ?? 0,
        nfhs6: districtVal6 ?? 0,
        nfhs5Formatted: districtVal5 !== null ? `${districtVal5.toFixed(1)}${unit}` : "—",
        nfhs6Formatted: districtVal6 !== null ? `${districtVal6.toFixed(1)}${unit}` : "—",
      },
      {
        category: `${stateName} Average`,
        nfhs5: stateAvg5 ?? 0,
        nfhs6: stateAvg6 ?? 0,
        nfhs5Formatted: stateAvg5 !== null ? `${stateAvg5.toFixed(1)}${unit}` : "—",
        nfhs6Formatted: stateAvg6 !== null ? `${stateAvg6.toFixed(1)}${unit}` : "—",
      },
    ],
    [activeDistrict.district_name, stateName, districtVal5, districtVal6, stateAvg5, stateAvg6, unit]
  );

  const yDomainMax = useMemo(() => {
    const vals = [districtVal5, districtVal6, stateAvg5, stateAvg6].filter(
      (v): v is number => typeof v === "number"
    );
    const maxVal = vals.length > 0 ? Math.max(...vals) : 100;
    return unit === "%" ? 100 : Math.max(100, Math.ceil((maxVal * 1.15) / 10) * 10);
  }, [districtVal5, districtVal6, stateAvg5, stateAvg6, unit]);

  // Concise factual tooltip showing only Entity, Dataset Period, and Value
  const ConciseBenchmarkTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: number;
      name: string;
      color: string;
      payload: any;
    }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-[#1A1D27] border border-[#2D3148] rounded-xl px-4 py-3 shadow-2xl text-xs space-y-2 pointer-events-none min-w-[190px]">
        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider border-b border-[#2D3148]/60 pb-1.5">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-300 font-medium text-xs">{entry.name}</span>
              </div>
              <span className="font-extrabold text-white text-xs tabular-nums" style={{ color: entry.color }}>
                {typeof entry.value === "number" ? `${entry.value.toFixed(1)}${unit}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBarTopLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null || value === 0) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#D1D5DB"
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
      >
        {`${Number(value).toFixed(1)}${unit}`}
      </text>
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
            <Link
              href={`/district/${districtId}`}
              className="px-4 py-2 rounded-full bg-[#1A1D27] border border-[#2D3148] text-xs text-gray-300 hover:text-white hover:border-orange-500/40 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
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

        {/* Selected Indicator Description Banner */}
        <div className="p-4 rounded-xl bg-[#0F1117]/80 border border-[#2D3148] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
        </div>

        {/* Unified District vs State Benchmark Comparison (Full Width) */}
        <div className="w-full bg-[#0F1117]/70 border border-[#2D3148] rounded-2xl p-5 sm:p-6 space-y-4">
          {/* Chart Header & Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D3148]/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                  District vs State Benchmark
                </h3>
                <span className="text-[10px] text-gray-400 font-semibold px-2 py-0.5 rounded bg-[#1A1D27] border border-[#2D3148]">
                  Unit: {unit}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <p className="text-xs text-gray-400 font-medium">
                  {activeDistrict.district_name} vs {stateName} &bull; {selectedMeta?.label || activeField}
                </p>
                {districtChange !== null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1D27] border border-[#2D3148] text-gray-300">
                    <span className="text-orange-400">{activeDistrict.district_name}</span>
                    <span className={districtChange >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {districtChange > 0 ? "+" : ""}{districtChange} pp
                    </span>
                  </span>
                )}
                {stateChange !== null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1D27] border border-[#2D3148] text-gray-300">
                    <span className="text-sky-400">{stateName} Avg</span>
                    <span className={stateChange >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {stateChange > 0 ? "+" : ""}{stateChange} pp
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Grouping Toggle */}
            <div className="flex items-center gap-1 bg-[#1A1D27] border border-[#2D3148] p-1 rounded-lg self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartGrouping("period")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  chartGrouping === "period"
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm"
                    : "text-gray-400 hover:text-white border border-transparent"
                }`}
              >
                By Survey Period
              </button>
              <button
                type="button"
                onClick={() => setChartGrouping("entity")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  chartGrouping === "entity"
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm"
                    : "text-gray-400 hover:text-white border border-transparent"
                }`}
              >
                By District / State
              </button>
            </div>
          </div>

          {/* Grouped Bar Chart Area */}
          <div className="h-[320px] sm:h-[360px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartGrouping === "period" ? periodChartData : entityChartData}
                margin={{ top: 25, right: 24, left: 0, bottom: 10 }}
                barCategoryGap="28%"
                barGap={8}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2D3148"
                  vertical={false}
                  horizontal={true}
                />
                <XAxis
                  dataKey="category"
                  tick={{ fill: "#D1D5DB", fontSize: 12, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: "#2D3148" }}
                  dy={6}
                />
                <YAxis
                  domain={[0, yDomainMax]}
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}${unit}`}
                />
                <Tooltip content={<ConciseBenchmarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                {chartGrouping === "period" ? (
                  <>
                    <Bar
                      dataKey="district"
                      name={activeDistrict.district_name}
                      fill="#F97316"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={56}
                      label={renderBarTopLabel}
                    />
                    <Bar
                      dataKey="stateAvg"
                      name={`${stateName} Average`}
                      fill="#38BDF8"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={56}
                      label={renderBarTopLabel}
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="nfhs5"
                      name="NFHS-5 (2019–21)"
                      fill="#F97316"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={56}
                      label={renderBarTopLabel}
                    />
                    <Bar
                      dataKey="nfhs6"
                      name="NFHS-6 (2023–24)"
                      fill="#38BDF8"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={56}
                      label={renderBarTopLabel}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Compact Legend & Dataset Indicator */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs border-t border-[#2D3148]/60 pt-3">
            {chartGrouping === "period" ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#F97316]" />
                  <span className="text-white font-semibold">{activeDistrict.district_name}</span>
                  <span className="text-gray-500 text-[11px]">(Selected District)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#38BDF8]" />
                  <span className="text-white font-semibold">{stateName} Average</span>
                  <span className="text-gray-500 text-[11px]">(State Benchmark)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#F97316]" />
                  <span className="text-white font-semibold">NFHS-5</span>
                  <span className="text-gray-400 text-[11px]">(2019–21 Baseline)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#38BDF8]" />
                  <span className="text-white font-semibold">NFHS-6</span>
                  <span className="text-gray-400 text-[11px]">(2023–24 Latest)</span>
                </div>
              </>
            )}
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
                  href={`/district/${districtId}/category/${k}`}
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