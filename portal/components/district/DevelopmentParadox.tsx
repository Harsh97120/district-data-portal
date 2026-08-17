"use client";

import type { DistrictMetrics } from "@/lib/types/district";
import { checkDevelopmentParadoxes, detectAnomalies } from "@/lib/ml-utils";

interface DevelopmentParadoxProps {
  district: DistrictMetrics;
  allDistricts: DistrictMetrics[];
}

export default function DevelopmentParadox({ district, allDistricts }: DevelopmentParadoxProps) {
  const paradoxes = checkDevelopmentParadoxes(district);
  const anomalies = detectAnomalies(district, allDistricts);

  const positiveAnomalies = anomalies.filter((a) => a.type === "positive");
  const negativeAnomalies = anomalies.filter((a) => a.type === "negative");

  const hasInsights = paradoxes.length > 0 || anomalies.length > 0;

  if (!hasInsights) {
    return (
      <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6 text-center text-gray-500 text-sm">
        No significant statistical paradoxes or anomalies detected for this district.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Paradox Engine */}
      <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6 flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Development Paradoxes</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Counter-intuitive relationships between indicators and service access
          </p>
        </div>

        {paradoxes.length > 0 ? (
          <div className="space-y-4 flex-1">
            {paradoxes.map((p, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/25 space-y-3"
              >
                <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {p.title}
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{p.description}</p>
                <div className="flex gap-4 pt-1 text-xs">
                  <div>
                    <span className="text-gray-500">{p.primaryMetricLabel}:</span>{" "}
                    <span className="text-white font-semibold">{p.primaryMetricValue}</span>
                  </div>
                  <div className="w-px bg-[#2D3148]" />
                  <div>
                    <span className="text-gray-500">{p.secondaryMetricLabel}:</span>{" "}
                    <span className="text-orange-400 font-semibold">{p.secondaryMetricValue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-[#2D3148] rounded-xl text-xs text-gray-500 text-center">
            No developmental paradoxes found. Indicators align with standard correlations.
          </div>
        )}
      </div>

      {/* Anomaly Detection */}
      <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Statistical Outliers</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Z-score analysis flagging indicators deviating &gt; 1.5 standard deviations from the state mean
          </p>
        </div>

        <div className="space-y-4">
          {/* Positive Outliers */}
          {positiveAnomalies.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[#66BB6A] uppercase tracking-wider mb-2">
                Positive Strengths (Outliers)
              </h4>
              <div className="space-y-2">
                {positiveAnomalies.map((a) => (
                  <div
                    key={a.field}
                    className="p-3 rounded-xl bg-[#0F1117] border border-[#2D3148] text-xs flex justify-between items-center gap-3"
                  >
                    <div>
                      <p className="text-white font-medium">{a.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        State Avg: {a.mean.toFixed(1)}% · SD: {a.stdDev.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#66BB6A]">{a.value.toFixed(1)}%</span>
                      <p className="text-[9px] text-gray-500 mt-0.5">+{a.zScore.toFixed(1)} Z</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Negative Outliers */}
          {negativeAnomalies.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[#EF5350] uppercase tracking-wider mb-2">
                Development Gaps (Outliers)
              </h4>
              <div className="space-y-2">
                {negativeAnomalies.map((a) => (
                  <div
                    key={a.field}
                    className="p-3 rounded-xl bg-[#0F1117] border border-[#2D3148] text-xs flex justify-between items-center gap-3"
                  >
                    <div>
                      <p className="text-white font-medium">{a.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        State Avg: {a.mean.toFixed(1)}% · SD: {a.stdDev.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#EF5350]">{a.value.toFixed(1)}%</span>
                      <p className="text-[9px] text-gray-500 mt-0.5">{a.zScore.toFixed(1)} Z</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {anomalies.length === 0 && (
            <div className="p-8 border border-dashed border-[#2D3148] rounded-xl text-xs text-gray-500 text-center">
              All indicators are within normal statistical ranges (1.5 standard deviations) of the state average.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
