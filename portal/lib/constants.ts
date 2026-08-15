import type { StateInfo } from "@/lib/types/district";

// ─── GeoJSON Property Keys ─────────────────────────────────────────────────
// Update these if your downloaded GeoJSON files use different property names.
export const GEOJSON_PROPS = {
  districtName: "dtname",   // property key in datta07 district GeoJSON (also falls back to DISTRICT)
  stateName:    "STNAME",   // property key for state name in states GeoJSON
  stateCode:    "ST_CODE",  // property key for state code (may be absent)
} as const;

// ─── Colour Palette ────────────────────────────────────────────────────────
export const COLORS = {
  primary:       "#FF6B35",  // saffron-orange — active states, highlights
  secondary:     "#1B4332",  // deep forest green — navbar, footer
  accent:        "#FFD700",  // gold — India flag accent
  bgDark:        "#0F1117",  // near-black — page background
  surface:       "#1A1D27",  // dark surface — cards, panels
  surfaceLight:  "#242838",  // lighter surface — hover states
  border:        "#2D3148",  // subtle border
  textPrimary:   "#F0F0F0",  // main text
  textSecondary: "#9CA3AF",  // muted text / labels
  choroplethLo:  "#FFF3E0",  // low-value districts (choropleth)
  choroplethHi:  "#E65100",  // high-value districts (choropleth)
  noData:        "#374151",  // districts with no data
} as const;

// ─── Choropleth Steps (for literacy_rate by default) ──────────────────────
export const CHOROPLETH_STEPS = [
  { threshold: 60,  color: "#FFF3E0" },
  { threshold: 65,  color: "#FFE0B2" },
  { threshold: 70,  color: "#FFCC80" },
  { threshold: 75,  color: "#FFA726" },
  { threshold: 80,  color: "#FB8C00" },
  { threshold: 85,  color: "#F57C00" },
  { threshold: 90,  color: "#E65100" },
  { threshold: 100, color: "#BF360C" },
] as const;

// ─── Metric Field Labels ───────────────────────────────────────────────────
export const METRIC_LABELS: Record<string, { label: string; unit: string; description: string }> = {
  literacy_rate:       { label: "Literacy Rate",           unit: "%",            description: "Percentage of population who can read and write" },
  sex_ratio:           { label: "Sex Ratio",               unit: "per 1,000 men", description: "Number of females per 1,000 males" },
  households_surveyed: { label: "Households Surveyed",     unit: "",             description: "Number of households surveyed in NFHS-5" },
  women_interviewed:   { label: "Women Interviewed",       unit: "(15–49 yrs)",  description: "Number of women aged 15–49 years interviewed" },
  men_interviewed:     { label: "Men Interviewed",         unit: "(15–54 yrs)",  description: "Number of men aged 15–54 years interviewed" },
  child_population_pct:{ label: "Child Population",        unit: "%",            description: "Percentage of population below 15 years of age" },
  household_size_avg:  { label: "Avg. Household Size",     unit: "persons",      description: "Average number of persons per household" },
};

// The 5 fields to show in the district detail panel and bar chart
export const PRIMARY_METRICS: (keyof typeof METRIC_LABELS)[] = [
  "literacy_rate",
  "sex_ratio",
  "households_surveyed",
  "women_interviewed",
  "men_interviewed",
];

// ─── State Registry ────────────────────────────────────────────────────────
// All 28 states + 8 UTs. hasData = true means data/metrics/[code].json exists.
// Flip hasData to true as you add more state JSON files.
export const STATES: StateInfo[] = [
  { code: "AP", name: "Andhra Pradesh",          geoName: "Andhra Pradesh",          hasData: false },
  { code: "AR", name: "Arunachal Pradesh",        geoName: "Arunachal Pradesh",        hasData: false },
  { code: "AS", name: "Assam",                   geoName: "Assam",                    hasData: false },
  { code: "BR", name: "Bihar",                   geoName: "Bihar",                    hasData: false },
  { code: "CG", name: "Chhattisgarh",            geoName: "Chhattisgarh",             hasData: false },
  { code: "GA", name: "Goa",                     geoName: "Goa",                      hasData: false },
  { code: "GJ", name: "Gujarat",                 geoName: "Gujarat",                  hasData: true  },
  { code: "HR", name: "Haryana",                 geoName: "Haryana",                  hasData: false },
  { code: "HP", name: "Himachal Pradesh",         geoName: "Himachal Pradesh",         hasData: false },
  { code: "JH", name: "Jharkhand",               geoName: "Jharkhand",                hasData: false },
  { code: "KA", name: "Karnataka",               geoName: "Karnataka",                hasData: false },
  { code: "KL", name: "Kerala",                  geoName: "Kerala",                   hasData: false },
  { code: "MP", name: "Madhya Pradesh",           geoName: "Madhya Pradesh",           hasData: false },
  { code: "MH", name: "Maharashtra",             geoName: "Maharashtra",              hasData: false },
  { code: "MN", name: "Manipur",                 geoName: "Manipur",                  hasData: false },
  { code: "ML", name: "Meghalaya",               geoName: "Meghalaya",                hasData: false },
  { code: "MZ", name: "Mizoram",                 geoName: "Mizoram",                  hasData: false },
  { code: "NL", name: "Nagaland",                geoName: "Nagaland",                 hasData: false },
  { code: "OD", name: "Odisha",                  geoName: "Odisha",                   hasData: false },
  { code: "PB", name: "Punjab",                  geoName: "Punjab",                   hasData: false },
  { code: "RJ", name: "Rajasthan",               geoName: "Rajasthan",                hasData: false },
  { code: "SK", name: "Sikkim",                  geoName: "Sikkim",                   hasData: false },
  { code: "TN", name: "Tamil Nadu",              geoName: "Tamil Nadu",               hasData: false },
  { code: "TS", name: "Telangana",               geoName: "Telangana",                hasData: false },
  { code: "TR", name: "Tripura",                 geoName: "Tripura",                  hasData: false },
  { code: "UP", name: "Uttar Pradesh",           geoName: "Uttar Pradesh",            hasData: false },
  { code: "UK", name: "Uttarakhand",             geoName: "Uttarakhand",              hasData: false },
  { code: "WB", name: "West Bengal",             geoName: "West Bengal",              hasData: false },
  // Union Territories
  { code: "AN", name: "Andaman & Nicobar",       geoName: "Andaman & Nicobar",        hasData: false },
  { code: "CH", name: "Chandigarh",              geoName: "Chandigarh",               hasData: false },
  { code: "DN", name: "Dadra & Nagar Haveli",    geoName: "Dadra & Nagar Haveli",     hasData: false },
  { code: "DD", name: "Daman & Diu",             geoName: "Daman & Diu",              hasData: false },
  { code: "DL", name: "Delhi",                   geoName: "Delhi",                    hasData: false },
  { code: "JK", name: "Jammu & Kashmir",         geoName: "Jammu & Kashmir",          hasData: false },
  { code: "LA", name: "Ladakh",                  geoName: "Ladakh",                   hasData: false },
  { code: "LD", name: "Lakshadweep",             geoName: "Lakshadweep",              hasData: false },
  { code: "PY", name: "Puducherry",              geoName: "Puducherry",               hasData: false },
];

export const STATE_BY_CODE = Object.fromEntries(STATES.map((s) => [s.code, s]));
export const STATE_BY_GEONAME = Object.fromEntries(STATES.map((s) => [s.geoName.toLowerCase(), s]));
