/**
 * Official State-wise Multidimensional Poverty Index (MPI) Headcount Ratio (HCR) data
 * Sources:
 * - NITI Aayog National Multidimensional Poverty Index: A Progress Review (NFHS-5, 2019-21)
 * - NITI Aayog National MPI Baseline Report
 */

export interface MpiRange {
  min: number;
  max: number;
  label: string;
  sublabel: string;
  color: string;
}

/**
 * Choropleth color palette matching the portal's warm amber-to-crimson scale
 */
export const MPI_CHOROPLETH_RANGES: readonly MpiRange[] = [
  { min: 0,  max: 5,   label: "< 5%",     sublabel: "Lowest deprivation",   color: "#FFF3E0" },
  { min: 5,  max: 10,  label: "5% – 10%", sublabel: "Low deprivation",      color: "#FFE0B2" },
  { min: 10, max: 15,  label: "10% – 15%",sublabel: "Moderate-low",         color: "#FFCC80" },
  { min: 15, max: 20,  label: "15% – 20%",sublabel: "Moderate deprivation", color: "#FFA726" },
  { min: 20, max: 30,  label: "20% – 30%",sublabel: "Substantial",          color: "#FB8C00" },
  { min: 30, max: 40,  label: "30% – 40%",sublabel: "High deprivation",     color: "#E65100" },
  { min: 40, max: 100, label: "> 40%",    sublabel: "Critical deprivation", color: "#BF360C" },
] as const;

/**
 * State MPI Headcount Ratio (% of population living in multidimensional poverty)
 * Keyed by State Code (ISO 3166-2:IN style codes)
 */
export const STATE_MPI_DATA: Record<string, { mpi_hcr: number; name: string }> = {
  KL: { mpi_hcr: 0.70,  name: "Kerala" },
  PY: { mpi_hcr: 1.72,  name: "Puducherry" },
  LD: { mpi_hcr: 1.82,  name: "Lakshadweep" },
  LA: { mpi_hcr: 3.53,  name: "Ladakh" },
  GA: { mpi_hcr: 3.79,  name: "Goa" },
  SK: { mpi_hcr: 3.80,  name: "Sikkim" },
  AN: { mpi_hcr: 4.47,  name: "Andaman & Nicobar" },
  TN: { mpi_hcr: 4.91,  name: "Tamil Nadu" },
  DL: { mpi_hcr: 5.25,  name: "Delhi" },
  PB: { mpi_hcr: 5.61,  name: "Punjab" },
  TS: { mpi_hcr: 5.88,  name: "Telangana" },
  CH: { mpi_hcr: 5.97,  name: "Chandigarh" },
  DD: { mpi_hcr: 6.55,  name: "Daman & Diu" },
  HP: { mpi_hcr: 7.93,  name: "Himachal Pradesh" },
  MZ: { mpi_hcr: 10.06, name: "Mizoram" },
  HR: { mpi_hcr: 11.78, name: "Haryana" },
  JK: { mpi_hcr: 12.31, name: "Jammu & Kashmir" },
  AP: { mpi_hcr: 12.61, name: "Andhra Pradesh" },
  KA: { mpi_hcr: 13.62, name: "Karnataka" },
  MH: { mpi_hcr: 15.24, name: "Maharashtra" },
  TR: { mpi_hcr: 16.76, name: "Tripura" },
  UK: { mpi_hcr: 17.95, name: "Uttarakhand" },
  GJ: { mpi_hcr: 18.54, name: "Gujarat" },
  MN: { mpi_hcr: 19.66, name: "Manipur" },
  WB: { mpi_hcr: 20.98, name: "West Bengal" },
  NL: { mpi_hcr: 23.83, name: "Nagaland" },
  AR: { mpi_hcr: 24.09, name: "Arunachal Pradesh" },
  DN: { mpi_hcr: 26.40, name: "Dadra & Nagar Haveli" },
  RJ: { mpi_hcr: 28.67, name: "Rajasthan" },
  OD: { mpi_hcr: 29.07, name: "Odisha" },
  CG: { mpi_hcr: 30.10, name: "Chhattisgarh" },
  AS: { mpi_hcr: 32.30, name: "Assam" },
  ML: { mpi_hcr: 32.74, name: "Meghalaya" },
  MP: { mpi_hcr: 36.79, name: "Madhya Pradesh" },
  UP: { mpi_hcr: 37.41, name: "Uttar Pradesh" },
  JH: { mpi_hcr: 42.20, name: "Jharkhand" },
  BR: { mpi_hcr: 51.78, name: "Bihar" },
};

/**
 * Normalised mapping for state names found in GeoJSON
 */
const NORM_STATE_MAP: Record<string, string> = {
  "andhrapradesh": "AP",
  "arunachalpradesh": "AR",
  "assam": "AS",
  "bihar": "BR",
  "chhattisgarh": "CG",
  "goa": "GA",
  "gujarat": "GJ",
  "haryana": "HR",
  "himachalpradesh": "HP",
  "jharkhand": "JH",
  "karnataka": "KA",
  "kerala": "KL",
  "madhyapradesh": "MP",
  "maharashtra": "MH",
  "manipur": "MN",
  "meghalaya": "ML",
  "mizoram": "MZ",
  "nagaland": "NL",
  "odisha": "OD",
  "orissa": "OD",
  "punjab": "PB",
  "rajasthan": "RJ",
  "sikkim": "SK",
  "tamilnadu": "TN",
  "telangana": "TS",
  "tripura": "TR",
  "uttarpradesh": "UP",
  "uttarakhand": "UK",
  "uttaranchal": "UK",
  "westbengal": "WB",
  "andamanandnicobar": "AN",
  "andamanandnicobarislands": "AN",
  "andaman&nicobar": "AN",
  "andamannicobar": "AN",
  "chandigarh": "CH",
  "dadraandnagarhaveli": "DN",
  "dadra&nagarhaveli": "DN",
  "dadranagarhaveli": "DN",
  "damananddiu": "DD",
  "daman&diu": "DD",
  "damandiu": "DD",
  "delhi": "DL",
  "nctofdelhi": "DL",
  "jammuandkashmir": "JK",
  "jammu&kashmir": "JK",
  "jammukashmir": "JK",
  "ladakh": "LA",
  "lakshadweep": "LD",
  "puducherry": "PY",
  "pondicherry": "PY",
};

/**
 * Look up the MPI HCR for a state by code or raw name string
 */
export function getStateMpi(stateNameOrCode: string): number | null {
  if (!stateNameOrCode) return null;
  const upper = stateNameOrCode.toUpperCase().trim();
  if (STATE_MPI_DATA[upper]) {
    return STATE_MPI_DATA[upper].mpi_hcr;
  }
  // Try normalising & to and first
  const normWithAnd = stateNameOrCode.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  if (NORM_STATE_MAP[normWithAnd] && STATE_MPI_DATA[NORM_STATE_MAP[normWithAnd]]) {
    return STATE_MPI_DATA[NORM_STATE_MAP[normWithAnd]].mpi_hcr;
  }
  // Try direct stripping
  const normDirect = stateNameOrCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const code = NORM_STATE_MAP[normDirect];
  if (code && STATE_MPI_DATA[code]) {
    return STATE_MPI_DATA[code].mpi_hcr;
  }
  return null;
}

/**
 * Get choropleth fill color according to MPI HCR value
 */
export function getMpiChoroplethColor(mpiHcr: number | null | undefined): string {
  if (mpiHcr === null || mpiHcr === undefined) return "#374151"; // No data
  for (const step of MPI_CHOROPLETH_RANGES) {
    if (mpiHcr < step.max || step.max === 100) {
      return step.color;
    }
  }
  return "#BF360C";
}
