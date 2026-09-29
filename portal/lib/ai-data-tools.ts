import type { DistrictMetrics } from "@/lib/types/district";
import { METRIC_LABELS, INDICATOR_CATEGORIES, STATES } from "@/lib/constants";
import {
  getStateAverage,
  getPriorityAreas,
  getDimensionScores,
  getSimilarDistricts,
  runKMeansClustering,
  getMetricsForYear,
} from "@/lib/ml-utils";
import {
  fetchDistrictMetrics,
  fetchDistrictsIndex,
  type DistrictIndexEntry,
} from "@/lib/data-loader";

export interface ResolvedIndicator {
  field: string;
  label: string;
  unit: string;
  description: string;
  direction: "positive" | "negative";
  categoryKey: string;
  categoryLabel: string;
}

export interface ComparisonDetail {
  field: string;
  label: string;
  unit: string;
  entity1Value: number;
  entity2Value: number;
  diff: number;
  diffFormatted: string;
  isEntity1Better: boolean;
  direction: "positive" | "negative";
}

export interface VisualBarDetail {
  label: string;
  unit: string;
  entity1Name: string;
  entity1Value: number;
  entity2Name: string;
  entity2Value: number;
  diffFormatted: string;
  isEntity1Better: boolean;
}

// Common district aliases
export const DISTRICT_SYNONYMS: Record<string, string> = {
  amdavad: "ahmedabad",
  ahmadabad: "ahmedabad",
  baroda: "vadodara",
  bombay: "mumbai",
  calcutta: "kolkata",
  madras: "chennai",
  bangalore: "bengaluru urban",
  bengaluru: "bengaluru urban",
  kutch: "kachchh",
  dohad: "dahod",
  trivandrum: "thiruvananthapuram",
  cochin: "ernakulam",
  mysore: "mysuru",
  belgaum: "belagavi",
  banaskantha: "banaskantha",
  "banas kantha": "banaskantha",
  sabarkantha: "sabarkantha",
  "sabar kantha": "sabarkantha",
  panchmahal: "panchmahal",
  "panch mahals": "panchmahal",
  dang: "dang",
  "the dangs": "dang",
  "chhota udepur": "chhota udepur",
  "chhota udaipur": "chhota udepur",
  gurgaon: "gurugram",
  allahabad: "prayagraj",
  benaras: "varanasi",
  kashi: "varanasi",
  poona: "pune",
  mangalore: "dakshina kannada",
  calicut: "kozhikode",
  pondicherry: "puducherry",
};

/**
 * Normalizes text to lowercase alphanumeric string
 */
export function normalizeSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Searches for a district in the 739-entry index with alias and fuzzy resolution
 */
export function findDistrictInIndex(
  query: string,
  index: DistrictIndexEntry[]
): DistrictIndexEntry | null {
  const cleanQ = query.trim().toLowerCase();
  const aliasResolved = DISTRICT_SYNONYMS[cleanQ] || cleanQ;
  const qSlug = normalizeSlug(aliasResolved);

  if (!qSlug || qSlug.length < 2) return null;

  // 1. Exact match on name
  let found = index.find(
    (d) => d.name.toLowerCase() === aliasResolved || normalizeSlug(d.name) === qSlug
  );
  if (found) return found;

  // 2. Exact match on id
  found = index.find((d) => normalizeSlug(d.id) === qSlug);
  if (found) return found;

  // 3. Prefix match
  found = index.find((d) => {
    const dSlug = normalizeSlug(d.name);
    return dSlug.startsWith(qSlug) || (qSlug.length >= 4 && qSlug.startsWith(dSlug));
  });
  if (found) return found;

  // 4. Substring match (min 4 chars)
  if (qSlug.length >= 4) {
    found = index.find((d) => normalizeSlug(d.name).includes(qSlug));
    if (found) return found;
  }

  // 5. Check if query contains any known district name
  const words = cleanQ.split(/[\s,–-]+/).filter((w) => w.length >= 4);
  for (const w of words) {
    const resolvedWord = DISTRICT_SYNONYMS[w] || w;
    const wSlug = normalizeSlug(resolvedWord);
    const subFound = index.find((d) => normalizeSlug(d.name) === wSlug || normalizeSlug(d.name).includes(wSlug));
    if (subFound) return subFound;
  }

  return null;
}

/**
 * Resolves natural language and typos into an exact indicator key
 */
export function resolveIndicatorFromQuery(query: string): ResolvedIndicator | null {
  const q = query.toLowerCase();

  // Keyword rules prioritizing specific phrases before broad ones
  const rules: { keywords: string[]; field: string }[] = [
    // Anaemia
    { keywords: ["child anaemia", "child anemia", "children anaemia", "children anemia", "anaemic kids", "anaemic children", "anemia in kids", "anemia in children", "anaemia in children"], field: "child_anaemia" },
    { keywords: ["women anaemia", "women anemia", "female anaemia", "female anemia", "mothers anaemia", "pregnant anaemia", "anaemic women"], field: "women_anaemia" },
    { keywords: ["anaemia", "anemia", "anaemic", "anemic", "hemoglobin", "haemoglobin", "iron deficiency"], field: "child_anaemia" },

    // Child growth / Nutrition
    { keywords: ["stunting", "stunted", "child stunting", "short for age", "height for age"], field: "child_stunting" },
    { keywords: ["wasting", "wasted", "child wasting", "acute malnutrition", "weight for height"], field: "child_wasting" },
    { keywords: ["underweight", "under weight", "child underweight", "low weight"], field: "child_underweight" },
    { keywords: ["exclusive breastfeeding", "breastfeeding", "breastfed", "breast feeding"], field: "exclusive_breastfeeding" },
    { keywords: ["adequate diet", "minimum diet", "dietary diversity", "child diet", "nutrition diet"], field: "adequate_diet" },

    // Maternal & Healthcare
    { keywords: ["vaccination", "vaccine", "vaccines", "vaccinated", "immunization", "immunised", "immunized"], field: "full_vaccination" },
    { keywords: ["institutional birth", "institutional births", "institutional delivery", "hospital birth", "hospital delivery", "clinic delivery", "deliveries in hospital"], field: "institutional_births" },
    { keywords: ["antenatal", "anc visit", "anc visits", "4 anc", "prenatal", "pregnancy checkup"], field: "anc_4_visits" },
    { keywords: ["postnatal", "pnc", "care after delivery", "postpartum"], field: "pnc_within_2_days" },
    { keywords: ["health insurance", "insurance coverage", "ayushman", "mediclaim", "medical insurance"], field: "health_insurance" },
    { keywords: ["blood pressure", "hypertension", "bp screening"], field: "bp_screening" },
    { keywords: ["diabetes", "blood sugar", "sugar test", "glucose screening"], field: "diabetes_screening" },

    // Education
    { keywords: ["female literacy", "women literacy", "literacy rate", "literacy", "literate", "can read and write"], field: "literacy_rate" },
    { keywords: ["women schooling", "female schooling", "girls schooling", "girls education", "women education", "10 years of schooling"], field: "women_schooling_10_years" },
    { keywords: ["school attendance", "children in school", "kids going to school", "school going"], field: "school_attendance_6_17" },
    { keywords: ["dropout", "drop out", "school dropout"], field: "dropout_rate" },
    { keywords: ["learning proficiency", "parakh", "aser", "learning level"], field: "learning_proficiency" },
    { keywords: ["retention rate", "school retention"], field: "retention_rate" },

    // Women & Gender
    { keywords: ["early marriage", "child marriage", "married before 18", "underage marriage"], field: "early_marriage" },
    { keywords: ["teenage pregnancy", "teen pregnancy", "adolescent pregnancy", "teenage mothers"], field: "teenage_pregnancy" },
    { keywords: ["contraceptive", "contraception", "family planning", "birth control", "condom", "sterilization"], field: "modern_contraceptive" },
    { keywords: ["bank account", "bank accounts", "financial inclusion", "women banking"], field: "women_bank_account" },
    { keywords: ["decision making", "household decisions", "women decision"], field: "women_decision_making" },
    { keywords: ["sex ratio", "gender ratio", "female ratio", "girls per 1000 boys", "females per 1000 males"], field: "sex_ratio" },

    // Basic Services & Living Conditions
    { keywords: ["electricity", "power", "lights", "power access", "electrified"], field: "electricity_access" },
    { keywords: ["drinking water", "clean water", "water access", "tap water", "safe water", "piped water"], field: "drinking_water_improved" },
    { keywords: ["sanitation", "toilet", "toilets", "latrine", "latrines", "flush toilet", "swachh"], field: "sanitation_facility_improved" },
    { keywords: ["cooking fuel", "clean fuel", "lpg", "gas cylinder", "clean cooking"], field: "clean_cooking_fuel" },
    { keywords: ["housing", "pucca house", "pucca housing", "solid housing", "shelter"], field: "housing_solid" },
    { keywords: ["internet", "internet access", "online access", "web access"], field: "internet_access" },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => q.includes(kw))) {
      const field = rule.field;
      const meta = METRIC_LABELS[field];
      if (meta) {
        let catKey = "basic_services";
        let catLabel = "General";
        for (const [k, v] of Object.entries(INDICATOR_CATEGORIES)) {
          if ((v.indicators as readonly string[]).includes(field)) {
            catKey = k;
            catLabel = v.label;
            break;
          }
        }
        return {
          field,
          label: meta.label,
          unit: meta.unit || "%",
          description: meta.description,
          direction: meta.direction,
          categoryKey: catKey,
          categoryLabel: catLabel,
        };
      }
    }
  }

  // Fallback: check exact field names in METRIC_LABELS
  for (const [key, meta] of Object.entries(METRIC_LABELS)) {
    const cleanLabel = meta.label.toLowerCase();
    if (q.includes(cleanLabel) || q.includes(key.replace(/_/g, " "))) {
      return {
        field: key,
        label: meta.label,
        unit: meta.unit || "%",
        description: meta.description,
        direction: meta.direction,
        categoryKey: "health",
        categoryLabel: "General",
      };
    }
  }

  return null;
}

/**
 * Computes comparative difference and formatting
 */
export function calculateDifference(field: string, val1: number, val2: number): ComparisonDetail {
  const meta = METRIC_LABELS[field];
  const unit = meta?.unit ?? "%";
  const direction = meta?.direction ?? "positive";

  const diff = parseFloat((val1 - val2).toFixed(1));
  const prefix = diff > 0 ? "+" : "";
  const unitSuffix = unit === "%" ? " pp" : unit ? ` ${unit}` : "";
  const diffFormatted = `${prefix}${diff}${unitSuffix}`;

  // Positive metric: higher is better (val1 > val2)
  // Negative metric: lower is better (val1 < val2)
  const isEntity1Better = direction === "positive" ? val1 > val2 : val1 < val2;

  return {
    field,
    label: meta?.label || field,
    unit: unit || "%",
    entity1Value: val1,
    entity2Value: val2,
    diff,
    diffFormatted,
    isEntity1Better,
    direction,
  };
}

/**
 * Core benchmark indicators for holistic comparisons
 */
export const CORE_COMPARISON_FIELDS = [
  "literacy_rate",
  "child_stunting",
  "child_anaemia",
  "institutional_births",
  "full_vaccination",
  "women_schooling_10_years",
  "school_attendance_6_17",
  "electricity_access",
  "sanitation_facility_improved",
  "sex_ratio",
] as const;

/**
 * Loads a district by name or ID, fetching cross-state JSON if needed
 */
export async function loadDistrictMetrics(
  districtEntry: DistrictIndexEntry,
  surveyYear: "NFHS-5" | "NFHS-6" = "NFHS-6"
): Promise<DistrictMetrics | null> {
  const stateData = await fetchDistrictMetrics(districtEntry.state_code);
  if (!stateData) return null;
  const raw = stateData.find((d) => d.district_id === districtEntry.id);
  if (!raw) return null;
  return getMetricsForYear(raw, surveyYear);
}

/**
 * Identifies the top health & nutrition vulnerabilities for a district
 */
export function auditDistrictHealthVulnerabilities(
  district: DistrictMetrics,
  allDistricts: DistrictMetrics[]
): {
  laggingIndicators: { label: string; value: number; stateAvg: number; diffFormatted: string; reason: string }[];
  leadingIndicators: { label: string; value: number; stateAvg: number; diffFormatted: string }[];
} {
  const stateAvg = getStateAverage(allDistricts);
  const healthKeys = [
    "child_anaemia",
    "women_anaemia",
    "child_stunting",
    "adequate_diet",
    "child_wasting",
    "child_underweight",
    "full_vaccination",
    "institutional_births",
    "anc_4_visits",
  ];

  const lagging: { label: string; value: number; stateAvg: number; diffFormatted: string; reason: string }[] = [];
  const leading: { label: string; value: number; stateAvg: number; diffFormatted: string }[] = [];

  for (const k of healthKeys) {
    const val = district[k as keyof DistrictMetrics] as number | null;
    const avg = stateAvg[k];
    const meta = METRIC_LABELS[k];
    if (typeof val === "number" && typeof avg === "number" && meta) {
      const diff = calculateDifference(k, val, avg);

      // Check if lagging relative to state benchmark
      if (!diff.isEntity1Better) {
        lagging.push({
          label: meta.label,
          value: val,
          stateAvg: avg,
          diffFormatted: diff.diffFormatted,
          reason:
            meta.direction === "negative"
              ? `Elevated by ${Math.abs(diff.diff).toFixed(1)} pp above state average (${avg.toFixed(1)}%)`
              : `Deficit of ${Math.abs(diff.diff).toFixed(1)} pp below state benchmark (${avg.toFixed(1)}%)`,
        });
      }
      // Check absolute epidemiological thresholds
      else if (
        (k === "child_anaemia" && val >= 40) ||
        (k === "women_anaemia" && val >= 40) ||
        (k === "child_stunting" && val >= 20) ||
        (k === "adequate_diet" && val <= 30) ||
        (k === "child_wasting" && val >= 10)
      ) {
        let concernReason = "";
        if (k === "child_anaemia" || k === "women_anaemia") {
          concernReason = `Exceeds WHO severe public health threshold (≥40%), despite being better than state average`;
        } else if (k === "child_stunting") {
          concernReason = `Chronic undernutrition affects >20% of under-5 children, requiring sustained intervention`;
        } else if (k === "adequate_diet") {
          concernReason = `Critical nutrition gap: only ${val.toFixed(1)}% of infants receive adequate dietary diversity`;
        } else if (k === "child_wasting") {
          concernReason = `Acute undernutrition exceeds the 10% medium-concern threshold`;
        }

        lagging.push({
          label: meta.label,
          value: val,
          stateAvg: avg,
          diffFormatted: diff.diffFormatted,
          reason: concernReason,
        });
      } else {
        leading.push({
          label: meta.label,
          value: val,
          stateAvg: avg,
          diffFormatted: diff.diffFormatted,
        });
      }
    }
  }

  // Sort lagging by largest severity / priority
  lagging.sort((a, b) => b.value - a.value);
  leading.sort((a, b) => Math.abs(b.value - b.stateAvg) - Math.abs(a.value - a.stateAvg));

  return { laggingIndicators: lagging, leadingIndicators: leading };
}
