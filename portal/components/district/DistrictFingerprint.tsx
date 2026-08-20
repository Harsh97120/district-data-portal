"use client";

import { useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { DistrictMetrics } from "@/lib/types/district";
import { getDimensionScores } from "@/lib/ml-utils";
import { useTheme } from "@/lib/ThemeContext";

interface DistrictFingerprintProps {
  district: DistrictMetrics;
}

const CATEGORY_NAMES: Record<string, string> = {
  health: "Health & Care",
  nutrition: "Nutrition",
  women: "Women & Gender",
  child_wellbeing: "Child Wellbeing",
  education: "Education",
  basic_services: "Basic Services",
};

export default function DistrictFingerprint({ district }: DistrictFingerprintProps) {
  const { theme } = useTheme();
  const [showMethodology, setShowMethodology] = useState(false);
  const scores = getDimensionScores(district);

  const data = Object.entries(scores).map(([key, val]) => ({
    subject: CATEGORY_NAMES[key] || key,
    value: val,
    fullMark: 100,
  }));

  return (
    <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-white">District Fingerprint</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Derived developmental profile across core dimensions
          </p>
        </div>
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showMethodology ? "Hide Methodology" : "View Methodology"}
        </button>
      </div>

      {showMethodology && (
        <div className="mb-6 p-4 rounded-xl bg-[#0F1117] border border-[#2D3148] text-xs text-gray-400 space-y-2 animate-fade-in">
          <p className="font-semibold text-white">Methodology & Score Calculation</p>
          <p>
            1. **Normalization**: Each individual indicator is normalized to a 0–100 scale. For positive indicators (e.g., electricity access), the score equals the raw value. For negative indicators (e.g., child stunting), the score is calculated as `100 - value`.
          </p>
          <p>
            2. **Aggregation**: Composite scores for each dimension are the unweighted averages of their constituent indicators.
          </p>
          <p className="text-orange-400/80">
            *Disclaimer: These scores are derived research models for local comparative analysis and do not represent official government indicators or scores.*
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
        {/* Radar Chart */}
        <div className="w-full max-w-[280px] h-[260px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid stroke={theme === "dark" ? "#2D3148" : "#E5E7EB"} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: theme === "dark" ? "#9CA3AF" : "#5B6472", fontSize: 11, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: theme === "dark" ? "#4B5563" : "#8B95A5", fontSize: 9 }}
                axisLine={false}
              />
              <Radar
                name={district.district_name}
                dataKey="value"
                stroke="#FF6B35"
                fill="#FF6B35"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Score Indicators */}
        <div className="grid grid-cols-2 gap-3 flex-1 w-full max-w-md">
          {Object.entries(scores).map(([key, val]) => {
            let colorClass = "text-[#66BB6A]"; // Green (>75)
            let bgClass = "bg-[#66BB6A]/10 border-[#66BB6A]/20";
            if (val < 50) {
              colorClass = "text-[#EF5350]"; // Red (<50)
              bgClass = "bg-[#EF5350]/10 border-[#EF5350]/20";
            } else if (val < 70) {
              colorClass = "text-[#FFA726]"; // Orange (50-70)
              bgClass = "bg-[#FFA726]/10 border-[#FFA726]/20";
            } else if (val < 75) {
              colorClass = "text-[#FFD700]"; // Yellow (70-75)
              bgClass = "bg-[#FFD700]/10 border-[#FFD700]/20";
            }
            return (
              <div
                key={key}
                className={`p-3 rounded-xl border flex flex-col justify-between ${bgClass}`}
              >
                <span className="text-xs text-gray-400 font-medium leading-tight">
                  {CATEGORY_NAMES[key] || key}
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-xl font-bold ${colorClass}`}>{val}</span>
                  <span className="text-[10px] text-gray-500">/100</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
