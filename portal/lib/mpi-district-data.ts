import { getMpiChoroplethColor } from "./mpi-state-data";

export interface MpiDistrictRecord {
  district_id: string;
  district_name: string;
  state_code: string;
  mpi_hcr: number | null;
  is_exact_match: boolean;
}

let mpiDistrictsCache: Record<string, MpiDistrictRecord> | null = null;
let mpiPromise: Promise<Record<string, MpiDistrictRecord>> | null = null;

/**
 * Fetch district-level Multidimensional Poverty Index (MPI) records.
 * Uses cached static data loaded from /data/mpi-data.json.
 */
export async function fetchMpiDistricts(): Promise<Record<string, MpiDistrictRecord>> {
  if (mpiDistrictsCache) return mpiDistrictsCache;
  if (mpiPromise) return mpiPromise;

  mpiPromise = (async () => {
    try {
      let data: {
        districts?: Record<
          string,
          {
            mpi_hcr: number | null;
            is_exact_match: boolean;
            district_id: string;
            district_name: string;
            state_code: string;
          }
        >;
      };

      if (typeof window === "undefined") {
        const fs = await import("fs/promises");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "public", "data", "mpi-data.json");
        data = JSON.parse(await fs.readFile(filePath, "utf-8"));
      } else {
        const res = await fetch("/data/mpi-data.json");
        if (!res.ok) return {};
        data = await res.json();
      }

      const map: Record<string, MpiDistrictRecord> = {};
      if (data && data.districts) {
        for (const [id, d] of Object.entries(data.districts)) {
          // Genuine MPI value only if exact match from official dataset
          const val = d.is_exact_match && typeof d.mpi_hcr === "number" ? d.mpi_hcr : null;
          map[id] = {
            district_id: d.district_id || id,
            district_name: d.district_name,
            state_code: d.state_code,
            mpi_hcr: val,
            is_exact_match: !!d.is_exact_match,
          };
        }
      }
      mpiDistrictsCache = map;
      return map;
    } catch {
      return {};
    }
  })();

  return mpiPromise;
}

/**
 * Normalise string for consistent lookup
 */
export function normaliseKey(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Find MPI Headcount Ratio for a district by ID or normalized name.
 * Returns null if the district has missing MPI data.
 */
export function getDistrictMpiHcr(
  districtId: string | null | undefined,
  districtName: string | null | undefined,
  stateCode: string,
  records: Record<string, MpiDistrictRecord> | null | undefined
): number | null {
  if (!records) return null;

  // 1. Direct match by district_id (e.g. "GJ-Ahmedabad")
  if (districtId && records[districtId]) {
    return records[districtId].mpi_hcr;
  }

  // 2. Lookup by State Code + normalized name
  if (districtName) {
    const targetNorm = normaliseKey(districtName);
    const upperState = stateCode.toUpperCase();
    for (const d of Object.values(records)) {
      if (d.state_code.toUpperCase() === upperState && normaliseKey(d.district_name) === targetNorm) {
        return d.mpi_hcr;
      }
    }
  }

  return null;
}

/**
 * Check if a state has any districts with missing MPI data
 */
export function stateHasMissingMpi(
  stateCode: string,
  records: Record<string, MpiDistrictRecord> | null | undefined
): boolean {
  if (!records) return false;
  const upperState = stateCode.toUpperCase();
  const stateDistricts = Object.values(records).filter(
    (d) => d.state_code.toUpperCase() === upperState
  );
  if (stateDistricts.length === 0) return false;
  return stateDistricts.some((d) => d.mpi_hcr === null);
}
