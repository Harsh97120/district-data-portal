import { METRIC_LABELS } from "@/lib/constants";

interface MetricCardProps {
  field: string;
  value: number | null | undefined;
  highlighted?: boolean;
}

function formatValue(field: string, value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (field === "literacy_rate" || field === "child_population_pct") {
    return value.toFixed(1) + "%";
  }
  if (field === "sex_ratio") {
    return Math.round(value).toLocaleString("en-IN");
  }
  if (field === "household_size_avg") {
    return value.toFixed(1);
  }
  return Math.round(value).toLocaleString("en-IN");
}

export default function MetricCard({ field, value, highlighted = false }: MetricCardProps) {
  const meta = METRIC_LABELS[field] ?? { label: field, unit: "", description: "" };
  const formatted = formatValue(field, value);
  const hasValue = value !== null && value !== undefined;

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl p-4 border transition-all duration-200
        ${highlighted
          ? "bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/40 shadow-lg shadow-orange-500/10"
          : "bg-[#1A1D27] border-[#2D3148] hover:border-[#3D4168]"
        }
      `}
    >
      {/* Accent line */}
      {highlighted && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400" />
      )}

      <p className="text-xs text-gray-500 mb-1 leading-tight">{meta.label}</p>
      <p className={`text-2xl font-bold tabular-nums ${hasValue ? (highlighted ? "text-orange-400" : "text-white") : "text-gray-600"}`}>
        {formatted}
      </p>
      {meta.unit && (
        <p className="text-xs text-gray-500 mt-0.5">{meta.unit}</p>
      )}
    </div>
  );
}
