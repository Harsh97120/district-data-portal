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
export const METRIC_LABELS: Record<string, { label: string; unit: string; description: string; direction: "positive" | "negative"; weight: number }> = {
  // Original demographics
  literacy_rate:       { label: "Literacy Rate",           unit: "%",            description: "Percentage of population who can read and write", direction: "positive", weight: 2.0 },
  sex_ratio:           { label: "Sex Ratio",               unit: "per 1,000 men", description: "Number of females per 1,000 males", direction: "positive", weight: 1.5 },
  households_surveyed: { label: "Households Surveyed",     unit: "",             description: "Number of households surveyed in NFHS-5", direction: "positive", weight: 0.0 },
  women_interviewed:   { label: "Women Interviewed",       unit: "(15–49 yrs)",  description: "Number of women aged 15–49 years interviewed", direction: "positive", weight: 0.0 },
  men_interviewed:     { label: "Men Interviewed",         unit: "(15–54 yrs)",  description: "Number of men aged 15–54 years interviewed", direction: "positive", weight: 0.0 },
  child_population_pct:{ label: "Child Population",        unit: "%",            description: "Percentage of population below 15 years of age", direction: "positive", weight: 1.0 },
  household_size_avg:  { label: "Avg. Household Size",     unit: "persons",      description: "Average number of persons per household", direction: "positive", weight: 0.0 },

  // Health
  health_insurance:     { label: "Health Insurance Coverage", unit: "%",            description: "Households with at least one member covered by a health scheme/insurance", direction: "positive", weight: 1.5 },
  institutional_births: { label: "Institutional Births",     unit: "%",            description: "Births in a health facility in the 5 years preceding the survey", direction: "positive", weight: 2.0 },
  anc_4_visits:         { label: "4+ ANC Visits",           unit: "%",            description: "Mothers who received at least 4 antenatal care visits", direction: "positive", weight: 1.8 },
  pnc_within_2_days:    { label: "PNC within 2 Days",       unit: "%",            description: "Mothers who received postnatal care within 2 days of delivery", direction: "positive", weight: 1.8 },
  full_vaccination:     { label: "Fully Vaccinated Children", unit: "%",            description: "Children aged 12-23 months who received all basic vaccinations", direction: "positive", weight: 2.0 },
  bp_screening:         { label: "Hypertension Screening",   unit: "%",            description: "Adults who have ever been screened for blood pressure/hypertension", direction: "positive", weight: 1.0 },
  diabetes_screening:   { label: "Blood Sugar Screening",   unit: "%",            description: "Adults who have ever been screened for high blood sugar/diabetes", direction: "positive", weight: 1.0 },

  // Nutrition
  child_stunting:       { label: "Child Stunting",          unit: "%",            description: "Children under 5 years who are stunted (height-for-age)", direction: "negative", weight: 2.5 },
  child_wasting:        { label: "Child Wasting",           unit: "%",            description: "Children under 5 years who are wasted (weight-for-height)", direction: "negative", weight: 2.2 },
  child_underweight:    { label: "Child Underweight",       unit: "%",            description: "Children under 5 years who are underweight (weight-for-age)", direction: "negative", weight: 2.3 },
  child_anaemia:        { label: "Child Anaemia",           unit: "%",            description: "Children aged 6-59 months who are anaemic", direction: "negative", weight: 2.0 },
  women_anaemia:        { label: "Women Anaemia",           unit: "%",            description: "Pregnant women aged 15-49 years who are anaemic", direction: "negative", weight: 1.8 },
  exclusive_breastfeeding: { label: "Exclusive Breastfeeding", unit: "%",            description: "Infants under 6 months who are exclusively breastfed", direction: "positive", weight: 1.8 },
  adequate_diet:        { label: "Minimum Adequate Diet",    unit: "%",            description: "Children aged 6-23 months receiving a minimum adequate diet", direction: "positive", weight: 2.0 },

  // Women & Gender
  women_schooling_10_years: { label: "Women's Schooling (10+ Yrs)", unit: "%",       description: "Women with 10 or more years of schooling", direction: "positive", weight: 2.0 },
  early_marriage:       { label: "Early Marriage",          unit: "%",            description: "Women aged 20-24 years married before age 18", direction: "negative", weight: 1.8 },
  teenage_pregnancy:    { label: "Teenage Pregnancy",       unit: "%",            description: "Women aged 15-19 years who have begun childbearing", direction: "negative", weight: 1.8 },
  modern_contraceptive: { label: "Modern Contraceptive Use", unit: "%",            description: "Currently married women using any modern contraceptive method", direction: "positive", weight: 1.5 },
  women_bank_account:   { label: "Women with Bank Accounts", unit: "%",            description: "Women who have a bank account that they use themselves", direction: "positive", weight: 1.5 },
  women_decision_making:{ label: "Decision Making Power",    unit: "%",            description: "Currently married women who participate in household decisions", direction: "positive", weight: 1.5 },

  // Education
  school_attendance_6_17: { label: "School Attendance",       unit: "%",            description: "School attendance for children aged 6-17 years", direction: "positive", weight: 2.0 },
  dropout_rate:         { label: "School Dropout Rate",     unit: "%",            description: "Derived dropout rate for school-going children", direction: "negative", weight: 1.8 },
  learning_proficiency: { label: "Learning Proficiency",    unit: "%",            description: "ASER/PARAKH-aligned basic learning levels proxy", direction: "positive", weight: 2.2 },
  retention_rate:       { label: "School Retention Rate",   unit: "%",            description: "Derived school retention rate from primary to secondary", direction: "positive", weight: 1.5 },

  // Basic Services
  electricity_access:   { label: "Electricity Access",      unit: "%",            description: "Households with electricity", direction: "positive", weight: 1.5 },
  drinking_water_improved: { label: "Improved Drinking Water", unit: "%",          description: "Households with an improved source of drinking water", direction: "positive", weight: 1.8 },
  sanitation_facility_improved: { label: "Improved Sanitation", unit: "%",          description: "Households with an improved sanitation facility (toilet access)", direction: "positive", weight: 2.0 },
  clean_cooking_fuel:   { label: "Clean Cooking Fuel",      unit: "%",            description: "Households using clean cooking fuel", direction: "positive", weight: 1.8 },
  housing_solid:        { label: "Pucca/Solid Housing",     unit: "%",            description: "Households living in pucca/solid structures", direction: "positive", weight: 1.5 },
  internet_access:      { label: "Internet Access",         unit: "%",            description: "Women who have ever used the internet", direction: "positive", weight: 1.2 },
};

export const INDICATOR_CATEGORIES = {
  health: {
    label: "Health & Healthcare Access",
    indicators: ["health_insurance", "institutional_births", "anc_4_visits", "pnc_within_2_days", "full_vaccination", "bp_screening", "diabetes_screening"],
  },
  nutrition: {
    label: "Nutrition",
    indicators: ["child_stunting", "child_wasting", "child_underweight", "child_anaemia", "women_anaemia", "exclusive_breastfeeding", "adequate_diet"],
  },
  women: {
    label: "Women & Gender",
    indicators: ["women_schooling_10_years", "early_marriage", "teenage_pregnancy", "modern_contraceptive", "women_bank_account", "women_decision_making"],
  },
  child_wellbeing: {
    label: "Child Wellbeing",
    indicators: ["child_population_pct", "full_vaccination", "child_stunting", "child_wasting", "child_underweight", "child_anaemia", "exclusive_breastfeeding", "adequate_diet"],
  },
  education: {
    label: "Education",
    indicators: ["literacy_rate", "school_attendance_6_17", "dropout_rate", "learning_proficiency", "retention_rate"],
  },
  basic_services: {
    label: "Basic Services & Living Conditions",
    indicators: ["electricity_access", "drinking_water_improved", "sanitation_facility_improved", "clean_cooking_fuel", "housing_solid", "internet_access"],
  }
} as const;

// The 5 fields to show in the district detail panel and bar chart
export const PRIMARY_METRICS = [
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
  { code: "AP", name: "Andhra Pradesh",          geoName: "Andhra Pradesh",          hasData: true  },
  { code: "AR", name: "Arunachal Pradesh",        geoName: "Arunachal Pradesh",        hasData: true  },
  { code: "AS", name: "Assam",                   geoName: "Assam",                    hasData: true  },
  { code: "BR", name: "Bihar",                   geoName: "Bihar",                    hasData: true  },
  { code: "CG", name: "Chhattisgarh",            geoName: "Chhattisgarh",             hasData: true  },
  { code: "GA", name: "Goa",                     geoName: "Goa",                      hasData: true  },
  { code: "GJ", name: "Gujarat",                 geoName: "Gujarat",                  hasData: true  },
  { code: "HR", name: "Haryana",                 geoName: "Haryana",                  hasData: true  },
  { code: "HP", name: "Himachal Pradesh",         geoName: "Himachal Pradesh",         hasData: true  },
  { code: "JH", name: "Jharkhand",               geoName: "Jharkhand",                hasData: true  },
  { code: "KA", name: "Karnataka",               geoName: "Karnataka",                hasData: true  },
  { code: "KL", name: "Kerala",                  geoName: "Kerala",                   hasData: true  },
  { code: "MP", name: "Madhya Pradesh",           geoName: "Madhya Pradesh",           hasData: true  },
  { code: "MH", name: "Maharashtra",             geoName: "Maharashtra",              hasData: true  },
  { code: "MN", name: "Manipur",                 geoName: "Manipur",                  hasData: true  },
  { code: "ML", name: "Meghalaya",               geoName: "Meghalaya",                hasData: true  },
  { code: "MZ", name: "Mizoram",                 geoName: "Mizoram",                  hasData: true  },
  { code: "NL", name: "Nagaland",                geoName: "Nagaland",                 hasData: true  },
  { code: "OD", name: "Odisha",                  geoName: "Odisha",                   hasData: true  },
  { code: "PB", name: "Punjab",                  geoName: "Punjab",                   hasData: true  },
  { code: "RJ", name: "Rajasthan",               geoName: "Rajasthan",                hasData: true  },
  { code: "SK", name: "Sikkim",                  geoName: "Sikkim",                   hasData: true  },
  { code: "TN", name: "Tamil Nadu",              geoName: "Tamil Nadu",               hasData: true  },
  { code: "TS", name: "Telangana",               geoName: "Telangana",                hasData: true  },
  { code: "TR", name: "Tripura",                 geoName: "Tripura",                  hasData: true  },
  { code: "UP", name: "Uttar Pradesh",           geoName: "Uttar Pradesh",            hasData: true  },
  { code: "UK", name: "Uttarakhand",             geoName: "Uttarakhand",              hasData: true  },
  { code: "WB", name: "West Bengal",             geoName: "West Bengal",              hasData: true  },
  // Union Territories
  { code: "AN", name: "Andaman & Nicobar",       geoName: "Andaman & Nicobar",        hasData: true  },
  { code: "CH", name: "Chandigarh",              geoName: "Chandigarh",               hasData: true  },
  { code: "DN", name: "Dadra & Nagar Haveli",    geoName: "Dadra & Nagar Haveli",     hasData: true  },
  { code: "DD", name: "Daman & Diu",             geoName: "Daman & Diu",              hasData: true  },
  { code: "DL", name: "Delhi",                   geoName: "Delhi",                    hasData: true  },
  { code: "JK", name: "Jammu & Kashmir",         geoName: "Jammu & Kashmir",          hasData: true  },
  { code: "LA", name: "Ladakh",                  geoName: "Ladakh",                   hasData: true  },
  { code: "LD", name: "Lakshadweep",             geoName: "Lakshadweep",              hasData: true  },
  { code: "PY", name: "Puducherry",              geoName: "Puducherry",               hasData: true  },
];

export const STATE_BY_CODE = Object.fromEntries(STATES.map((s) => [s.code, s]));
export const STATE_BY_GEONAME = Object.fromEntries(STATES.map((s) => [s.geoName.toLowerCase(), s]));
