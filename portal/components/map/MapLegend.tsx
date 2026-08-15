"use client";

import { CHOROPLETH_STEPS, COLORS } from "@/lib/constants";

interface MapLegendProps {
  title?: string;
}

export default function MapLegend({ title = "Literacy Rate (%)" }: MapLegendProps) {
  return (
    <div className="bg-[#1A1D27]/95 backdrop-blur border border-[#2D3148] rounded-xl p-3 shadow-lg min-w-[160px]">
      <p className="text-xs font-semibold text-gray-300 mb-2">{title}</p>
      <div className="space-y-1.5">
        {[
          { label: "No data", color: COLORS.noData },
          ...CHOROPLETH_STEPS.map((step, i) => ({
            label: i === 0
              ? `< ${step.threshold}`
              : `${CHOROPLETH_STEPS[i - 1].threshold}–${step.threshold}`,
            color: step.color,
          })),
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-4 h-3 rounded-sm flex-none"
              style={{ backgroundColor: color, border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
