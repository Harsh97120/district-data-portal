import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import path from "path";
import fs from "fs";
import type { DistrictMetrics } from "@/lib/types/district";
import { METRIC_LABELS, PRIMARY_METRICS, STATE_BY_CODE, STATES } from "@/lib/constants";
import Breadcrumb from "@/components/ui/Breadcrumb";
import MetricCard from "@/components/district/MetricCard";
import DemographicsChart from "@/components/district/DemographicsChart";

// ── Server-side data helpers (run at build time, use fs) ──────────────────

function loadDistrictsFromFs(stateCode: string): DistrictMetrics[] | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "metrics", `${stateCode}.json`);
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as DistrictMetrics[];
  } catch {
    return null;
  }
}

// ── Static params: generate one page per district ─────────────────────────

export async function generateStaticParams() {
  const allParams: { id: string }[] = [];
  for (const state of STATES) {
    if (!state.hasData) continue;
    const districts = loadDistrictsFromFs(state.code);
    if (!districts) continue;
    for (const d of districts) {
      allParams.push({ id: d.district_id });
    }
  }
  return allParams;
}

// ── Metadata ──────────────────────────────────────────────────────────────

interface DistrictPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DistrictPageProps): Promise<Metadata> {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const [stateCode, ...rest] = decoded.split("-");
  const districtName = rest.join(" ");
  return {
    title: `${districtName} District`,
    description: `NFHS-5 demographic data for ${districtName} district, ${STATE_BY_CODE[stateCode]?.name ?? stateCode}.`,
  };
}

// ── Format helpers ────────────────────────────────────────────────────────

function fmtValue(field: string, value: number | null): string {
  if (value === null) return "—";
  if (field.includes("rate") || field.includes("pct")) return `${value.toFixed(1)}%`;
  if (field === "household_size_avg") return value.toFixed(1);
  return value.toLocaleString("en-IN");
}

// ── Page component ────────────────────────────────────────────────────────

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const stateCode = decoded.split("-")[0];

  const districts = loadDistrictsFromFs(stateCode);
  const district = districts?.find((d) => d.district_id === decoded) ?? null;

  if (!district) notFound();

  const stateInfo = STATE_BY_CODE[stateCode];

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "India",                          href: "/" },
          { label: stateInfo?.name ?? stateCode,     href: `/state/${stateCode}` },
          { label: district.district_name },
        ]}
      />

      {/* Header */}
      <div className="mt-4 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{district.district_name}</h1>
            <p className="text-orange-400 text-lg font-medium mt-1">{district.state_name}</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <span className="px-3 py-1 text-xs rounded-full bg-[#1A1D27] border border-[#2D3148] text-gray-400">
              {district.metadata.source} · {district.metadata.year}
            </span>
            <Link
              href={`/state/${stateCode}`}
              className="text-xs text-gray-500 hover:text-orange-400 transition-colors"
            >
              ← Back to {stateInfo?.name ?? stateCode} map
            </Link>
          </div>
        </div>
      </div>

      {/* Primary metric cards */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Key Demographic Indicators
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PRIMARY_METRICS.map((field, i) => (
            <MetricCard
              key={field}
              field={field}
              value={district[field as keyof typeof district] as number | null}
              highlighted={i === 0}
            />
          ))}
        </div>
      </section>

      {/* Bar chart */}
      <section className="mb-8 bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Overview Chart
        </h2>
        <DemographicsChart district={district} />
      </section>

      {/* Full data table */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          All Available Data
        </h2>
        <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D3148]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Indicator</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D3148]">
              {Object.entries(METRIC_LABELS).map(([field, meta]) => {
                const raw = district[field as keyof typeof district];
                const value = typeof raw === "number" ? raw : null;
                return (
                  <tr key={field} className="hover:bg-[#242838] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-white font-medium">{meta.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {value !== null ? (
                        <span className="font-semibold text-orange-400 tabular-nums">
                          {fmtValue(field, value)}
                          {meta.unit && (
                            <span className="text-xs text-gray-500 ml-1">{meta.unit}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Attribution */}
      <p className="text-xs text-gray-600 text-center">
        Data source: {district.metadata.source} ({district.metadata.year}), Ministry of Health & Family Welfare, Government of India ·{" "}
        <a
          href="https://rchiips.org/nfhs/nfhs5.shtml"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:underline"
        >
          rchiips.org/nfhs
        </a>
      </p>

    </div>
  );
}
