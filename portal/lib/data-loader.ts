import type { DistrictMetrics } from "@/lib/types/district";

/**
 * Load district metrics for a given state code.
 * Reads from /data/metrics/[stateCode].json (relative to project root at build time).
 * On the client side, these are fetched as static JSON assets from /public/data/.
 */

// Cache loaded state data to avoid redundant fetches
const cache: Record<string, DistrictMetrics[]> = {};

/**
 * Fetch district metrics for a state (client-side fetch from /data/metrics/[code].json).
 * Returns null if the file does not exist.
 */
export async function fetchDistrictMetrics(
  stateCode: string
): Promise<DistrictMetrics[] | null> {
  const key = stateCode.toUpperCase();
  if (cache[key]) return cache[key];

  try {
    const res = await fetch(`/data/metrics/${key}.json`);
    if (!res.ok) return null;
    const data: DistrictMetrics[] = await res.json();
    cache[key] = data;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get a single district's metrics by district_id.
 * Returns null if not found.
 */
export async function fetchDistrictById(
  districtId: string
): Promise<DistrictMetrics | null> {
  // district_id format: STATE_CODE-district_name
  const stateCode = districtId.split("-")[0];
  const districts = await fetchDistrictMetrics(stateCode);
  if (!districts) return null;
  return districts.find((d) => d.district_id === districtId) ?? null;
}

// Known aliases: GeoJSON name (lowercase) → metrics district_name (lowercase)
const DISTRICT_ALIASES: Record<string, string> = {
  // Gujarat (datta07 spelling → NFHS-5 spelling)
  "ahmadabad":        "ahmedabad",
  "banas kantha":     "banaskantha",
  "chota udaipur":    "chhota udaipur",
  "dohad":            "dahod",
  "devbhumi dwarka":  "devbhoomi dwarka",
  "kachchh":          "kutch",
  "sabar kantha":     "sabarkantha",
  "panch mahals":     "panchmahal",
  "the dangs":        "dang",
};

/**
 * Build a lookup map: district_name (lower-case) → DistrictMetrics.
 * Used to join GeoJSON features with metric data by name.
 */
export function buildDistrictNameMap(
  districts: DistrictMetrics[]
): Map<string, DistrictMetrics> {
  const map = new Map<string, DistrictMetrics>();

  // Helper: strip all spaces and special chars for fuzzy matching
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const d of districts) {
    const lower = d.district_name.toLowerCase();
    map.set(lower, d);           // exact lowercase
    map.set(slug(lower), d);      // slug (no spaces/punctuation)

    // Also index by district_id suffix
    const suffix = d.district_id.split("-").slice(1).join("-").toLowerCase();
    map.set(suffix, d);
  }

  // Add alias entries pointing to the already-indexed metrics
  for (const [geoName, metricsName] of Object.entries(DISTRICT_ALIASES)) {
    const target = map.get(metricsName);
    if (target) {
      map.set(geoName, target);
      map.set(geoName.replace(/[^a-z0-9]/g, ""), target); // slug alias too
    }
  }

  return map;
}

/**
 * Load all district data for static page generation (used in generateStaticParams).
 * This runs at build time via Node.js file system access.
 */
export async function loadAllStateCodesWithData(): Promise<string[]> {
  // Import the STATES list (tree-shaken, no runtime fetch needed at build)
  const { STATES } = await import("@/lib/constants");
  return STATES.filter((s) => s.hasData).map((s) => s.code);
}
