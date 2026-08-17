import type { Metadata } from "next";
import { notFound } from "next/navigation";
import path from "path";
import fs from "fs";
import type { DistrictMetrics } from "@/lib/types/district";
import { STATE_BY_CODE, STATES } from "@/lib/constants";
import DistrictPageClient from "./DistrictPageClient";

// ── Server-side data helpers ──────────────────────────────────────────────

function loadDistrictsFromFs(stateCode: string): DistrictMetrics[] | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "metrics", `${stateCode.toUpperCase()}.json`);
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
    title: `${districtName} District Intelligence Dashboard`,
    description: `Insight-first ML + LLM comparative analysis for ${districtName} district, ${STATE_BY_CODE[stateCode]?.name ?? stateCode}.`,
  };
}

// ── Page component ────────────────────────────────────────────────────────

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const stateCode = decoded.split("-")[0];

  const districts = loadDistrictsFromFs(stateCode);
  const district = districts?.find((d) => d.district_id === decoded) ?? null;

  if (!district || !districts) notFound();

  const stateInfo = STATE_BY_CODE[stateCode];

  return (
    <DistrictPageClient
      district={district}
      allDistricts={districts}
      stateName={stateInfo?.name ?? stateCode}
      stateCode={stateCode}
    />
  );
}
