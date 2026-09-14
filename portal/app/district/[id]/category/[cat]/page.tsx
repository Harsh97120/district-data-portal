import type { Metadata } from "next";
import { notFound } from "next/navigation";
import path from "path";
import fs from "fs";
import type { DistrictMetrics } from "@/lib/types/district";
import { STATE_BY_CODE, STATES, INDICATOR_CATEGORIES } from "@/lib/constants";
import CategoryDetailClient from "./CategoryDetailClient";

const VALID_CATEGORIES = ["health", "nutrition", "women", "education"] as const;
type CategoryKey = (typeof VALID_CATEGORIES)[number];

function loadDistrictsFromFs(stateCode: string): DistrictMetrics[] | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "metrics", `${stateCode.toUpperCase()}.json`);
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as DistrictMetrics[];
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const allParams: { id: string; cat: string }[] = [];
  for (const state of STATES) {
    if (!state.hasData) continue;
    const districts = loadDistrictsFromFs(state.code);
    if (!districts) continue;
    for (const d of districts) {
      for (const cat of VALID_CATEGORIES) {
        allParams.push({ id: d.district_id, cat });
      }
    }
  }
  return allParams;
}

interface CategoryPageProps {
  params: Promise<{ id: string; cat: string }>;
  searchParams: Promise<{ year?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { id, cat } = await params;
  const decoded = decodeURIComponent(id);
  const [stateCode, ...rest] = decoded.split("-");
  const districtName = rest.join(" ");
  const catInfo = INDICATOR_CATEGORIES[cat as keyof typeof INDICATOR_CATEGORIES];
  return {
    title: `${catInfo?.label ?? cat} -- ${districtName} | District Intelligence`,
    description: `Detailed ${catInfo?.label ?? cat} indicators for ${districtName}, ${STATE_BY_CODE[stateCode]?.name ?? stateCode}. Compare district vs state averages across all verified NFHS indicators.`,
  };
}

export default async function CategoryDetailPage({ params, searchParams }: CategoryPageProps) {
  const { id, cat } = await params;
  const { year } = await searchParams;
  const decoded = decodeURIComponent(id);
  const stateCode = decoded.split("-")[0];

  if (!VALID_CATEGORIES.includes(cat as CategoryKey)) notFound();

  const districts = loadDistrictsFromFs(stateCode);
  const district = districts?.find((d) => d.district_id === decoded) ?? null;
  if (!district || !districts) notFound();

  const stateInfo = STATE_BY_CODE[stateCode];

  return (
    <CategoryDetailClient
      district={district}
      allDistricts={districts}
      categoryKey={cat as CategoryKey}
      stateName={stateInfo?.name ?? stateCode}
      stateCode={stateCode}
      districtId={decoded}
      defaultYear={year === "NFHS-5" ? "NFHS-5" : "NFHS-6"}
    />
  );
}