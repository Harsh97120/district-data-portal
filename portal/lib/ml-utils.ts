import type { DistrictMetrics } from "@/lib/types/district";
import { METRIC_LABELS, INDICATOR_CATEGORIES } from "@/lib/constants";

/**
 * Calculates the normalized score (0-100, where 100 is best) for a given metric.
 */
export function getNormalizedScore(field: string, value: number | null | undefined): number {
  if (value === null || value === undefined) return 50; // Neutral default
  const meta = METRIC_LABELS[field];
  if (!meta) return value;
  
  if (meta.direction === "positive") {
    return Math.max(0, Math.min(100, value));
  } else {
    return Math.max(0, Math.min(100, 100 - value));
  }
}

/**
 * Calculates composite scores (0-100) for the 6 key dimensions.
 */
export function getDimensionScores(district: DistrictMetrics): Record<string, number> {
  const scores: Record<string, number> = {};
  
  for (const [catKey, catInfo] of Object.entries(INDICATOR_CATEGORIES)) {
    let sum = 0;
    let count = 0;
    
    for (const field of catInfo.indicators) {
      const val = district[field as keyof DistrictMetrics];
      if (typeof val === "number") {
        sum += getNormalizedScore(field, val);
        count++;
      }
    }
    
    scores[catKey] = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
  }
  
  return scores;
}

/**
 * Returns the top K similar districts in the state using Euclidean distance of dimension scores.
 */
export function getSimilarDistricts(
  selectedDistrict: DistrictMetrics,
  allDistricts: DistrictMetrics[],
  k = 3
): DistrictMetrics[] {
  const selectedScores = getDimensionScores(selectedDistrict);
  const candidates = allDistricts.filter(d => d.district_id !== selectedDistrict.district_id);
  const keys = Object.keys(INDICATOR_CATEGORIES);

  const scoredCandidates = candidates.map(d => {
    const dScores = getDimensionScores(d);
    let sumSq = 0;
    for (const key of keys) {
      sumSq += Math.pow(selectedScores[key] - dScores[key], 2);
    }
    const distance = Math.sqrt(sumSq);
    return { district: d, distance };
  });

  scoredCandidates.sort((a, b) => a.distance - b.distance);
  return scoredCandidates.slice(0, k).map(item => item.district);
}

/**
 * Computes average indicator values across similar districts (peer average).
 */
export function getPeerAverage(similarDistricts: DistrictMetrics[]): Record<string, number> {
  const avg: Record<string, number> = {};
  if (similarDistricts.length === 0) return avg;

  const fields = Object.keys(METRIC_LABELS);
  for (const field of fields) {
    let sum = 0;
    let count = 0;
    for (const d of similarDistricts) {
      const val = d[field as keyof DistrictMetrics];
      if (typeof val === "number") {
        sum += val;
        count++;
      }
    }
    avg[field] = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
  }
  return avg;
}

/**
 * Computes average indicator values across the entire state.
 */
export function getStateAverage(allDistricts: DistrictMetrics[]): Record<string, number> {
  const avg: Record<string, number> = {};
  if (allDistricts.length === 0) return avg;

  const fields = Object.keys(METRIC_LABELS);
  for (const field of fields) {
    let sum = 0;
    let count = 0;
    for (const d of allDistricts) {
      const val = d[field as keyof DistrictMetrics];
      if (typeof val === "number") {
        sum += val;
        count++;
      }
    }
    avg[field] = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
  }
  return avg;
}

export interface ClusterResult {
  clusterId: number;
  label: string;
  districts: DistrictMetrics[];
  centroid: Record<string, number>;
}

/**
 * Runs a stable client-side K-Means clustering (K=4) based on the 6 composite scores.
 */
export function runKMeansClustering(allDistricts: DistrictMetrics[], k = 4): ClusterResult[] {
  const data = allDistricts.map(d => ({
    district: d,
    features: getDimensionScores(d)
  }));
  
  const keys = Object.keys(INDICATOR_CATEGORIES);
  
  // Pick k initial centroids spread deterministically through indices to keep it stable
  const centroids: Record<string, number>[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.min(data.length - 1, Math.floor((i * data.length) / k));
    centroids.push({ ...data[idx].features });
  }

  const assignments = new Array(data.length).fill(-1);
  let changed = true;
  let iterations = 0;
  
  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    // Assign to closest centroid
    for (let i = 0; i < data.length; i++) {
      let minDist = Infinity;
      let bestCentroid = -1;

      for (let c = 0; c < k; c++) {
        let sumSq = 0;
        for (const key of keys) {
          sumSq += Math.pow(data[i].features[key] - centroids[c][key], 2);
        }
        const dist = Math.sqrt(sumSq);
        if (dist < minDist) {
          minDist = dist;
          bestCentroid = c;
        }
      }

      if (assignments[i] !== bestCentroid) {
        assignments[i] = bestCentroid;
        changed = true;
      }
    }

    // Recompute centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = data.filter((_, idx) => assignments[idx] === c);
      if (clusterPoints.length > 0) {
        const nextCentroid: Record<string, number> = {};
        for (const key of keys) {
          let sum = 0;
          for (const p of clusterPoints) {
            sum += p.features[key];
          }
          nextCentroid[key] = parseFloat((sum / clusterPoints.length).toFixed(1));
        }
        centroids[c] = nextCentroid;
      }
    }
  }

  // Build clustering results
  const clusters: ClusterResult[] = Array.from({ length: k }, (_, cId) => {
    const clusterDistricts = data.filter((_, idx) => assignments[idx] === cId).map(p => p.district);
    return {
      clusterId: cId,
      label: "",
      districts: clusterDistricts,
      centroid: centroids[cId] || {}
    };
  });

  // Calculate overall performance average of each centroid
  const overallAverages = clusters.map(c => {
    let sum = 0;
    for (const key of keys) {
      sum += c.centroid[key] || 0;
    }
    return { cId: c.clusterId, avg: sum / keys.length };
  });

  // Sort descending to assign labels semantic value
  overallAverages.sort((a, b) => b.avg - a.avg);

  const labelMap: Record<number, string> = {
    0: "High Development Profile",
    1: "Basic Services-Led Profile",
    2: "Socially Lagging Profile",
    3: "Emerging Development Profile"
  };

  clusters.forEach(c => {
    const rank = overallAverages.findIndex(item => item.cId === c.clusterId);
    c.label = labelMap[rank] || `Development Profile Tier ${rank + 1}`;
  });

  return clusters;
}

export interface AnomalyResult {
  field: string;
  label: string;
  value: number;
  mean: number;
  stdDev: number;
  zScore: number;
  type: "positive" | "negative";
  description: string;
}

/**
 * Detects indicators that deviate significantly from the state averages (Z-score > 1.5 or < -1.5).
 */
export function detectAnomalies(
  selectedDistrict: DistrictMetrics,
  allDistricts: DistrictMetrics[]
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const fields = Object.keys(METRIC_LABELS).filter(f => METRIC_LABELS[f].weight > 0);

  for (const field of fields) {
    const values = allDistricts
      .map(d => d[field as keyof DistrictMetrics] as number)
      .filter(v => typeof v === "number");

    if (values.length < 5) continue;

    // Mean
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    // Standard Deviation
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) continue;

    const val = selectedDistrict[field as keyof DistrictMetrics] as number;
    if (typeof val !== "number") continue;

    const zScore = (val - mean) / stdDev;
    const meta = METRIC_LABELS[field];

    if (Math.abs(zScore) > 1.5) {
      const isPositiveDev = meta.direction === "positive" ? zScore > 0 : zScore < 0;
      anomalies.push({
        field,
        label: meta.label,
        value: val,
        mean,
        stdDev,
        zScore,
        type: isPositiveDev ? "positive" : "negative",
        description: isPositiveDev
          ? `Performing exceptionally well. This district is ${Math.abs(zScore).toFixed(1)} SD above the state average.`
          : `Significant lagging gap. This district is ${Math.abs(zScore).toFixed(1)} SD below the state average.`
      });
    }
  }

  return anomalies;
}

export interface PriorityArea {
  field: string;
  label: string;
  value: number;
  normalizedScore: number;
  stateAverage: number;
  priorityScore: number;
  reason: string;
}

/**
 * Ranks all indicators needing improvement based on severity, gap to state, and weights.
 */
export function getPriorityAreas(
  selectedDistrict: DistrictMetrics,
  allDistricts: DistrictMetrics[]
): PriorityArea[] {
  const stateAverages = getStateAverage(allDistricts);
  const priorities: PriorityArea[] = [];
  const fields = Object.keys(METRIC_LABELS).filter(f => METRIC_LABELS[f].weight > 0);

  for (const field of fields) {
    const val = selectedDistrict[field as keyof DistrictMetrics] as number;
    if (typeof val !== "number") continue;

    const meta = METRIC_LABELS[field];
    const stateAvg = stateAverages[field] ?? val;

    const normVal = getNormalizedScore(field, val);
    const normStateAvg = getNormalizedScore(field, stateAvg);

    const severity = 100 - normVal; // distance to optimal score of 100
    const gap = normStateAvg - normVal; // positive gap means district is lagging behind state
    const gapMultiplier = gap > 0 ? 1.0 + (gap / 100) : 0.8;

    const priorityScore = severity * meta.weight * gapMultiplier;

    let reason = "";
    if (gap > 10) {
      reason = `Critical: Lags the state average by a significant margin of ${gap.toFixed(1)}% (${val.toFixed(1)}${meta.unit} vs state ${stateAvg.toFixed(1)}${meta.unit}).`;
    } else if (severity > 40) {
      reason = `High severity: Performance is low overall (${val.toFixed(1)}${meta.unit}), demanding urgent intervention.`;
    } else {
      reason = `Moderate: Action is recommended to bridge local benchmarks.`;
    }

    priorities.push({
      field,
      label: meta.label,
      value: val,
      normalizedScore: normVal,
      stateAverage: stateAvg,
      priorityScore,
      reason
    });
  }

  // Sort descending by priority score
  priorities.sort((a, b) => b.priorityScore - a.priorityScore);
  return priorities;
}

export interface ParadoxResult {
  title: string;
  description: string;
  primaryMetricLabel: string;
  primaryMetricValue: number;
  secondaryMetricLabel: string;
  secondaryMetricValue: number;
  severity: "orange" | "yellow" | "red";
}

/**
 * Analyzes indicators to uncover counter-intuitive relationships or development paradoxes.
 */
export function checkDevelopmentParadoxes(selectedDistrict: DistrictMetrics): ParadoxResult[] {
  const paradoxes: ParadoxResult[] = [];
  const dimScores = getDimensionScores(selectedDistrict);

  // 1. Basic Services vs Child Nutrition Paradox
  const serviceScore = dimScores["basic_services"] || 0;
  const nutritionScore = dimScores["nutrition"] || 0;

  if (serviceScore > 75 && nutritionScore < 50) {
    paradoxes.push({
      title: "Infrastructure-Nutrition Paradox",
      description: `This district demonstrates high coverage of physical infrastructure and basic household services (Score: ${serviceScore}/100) alongside lagging child nutrition outcomes (Score: ${nutritionScore}/100). This indicates that physical living standards have improved, but child stunting, wasting, and anemia remain high. It suggests bottlenecks in nutrition counseling, dietary diversity, or local health service delivery rather than basic infrastructure.`,
      primaryMetricLabel: "Basic Services Score",
      primaryMetricValue: serviceScore,
      secondaryMetricLabel: "Child Nutrition Score",
      secondaryMetricValue: nutritionScore,
      severity: "orange"
    });
  }

  // 2. Female Education vs Women Empowerment Paradox
  const educationScore = dimScores["education"] || 0;
  const womenScore = dimScores["women"] || 0;

  if (educationScore > 70 && womenScore < 55) {
    paradoxes.push({
      title: "Education-Empowerment Gap",
      description: `Female literacy and educational attainment are relatively strong (Score: ${educationScore}/100), yet scores for women's healthcare access, economic empowerment, and decision-making lag behind (Score: ${womenScore}/100). This highlights a bottleneck where education is not fully translating into social autonomy or choices, pointing to potential socio-cultural or economic barriers.`,
      primaryMetricLabel: "Education Score",
      primaryMetricValue: educationScore,
      secondaryMetricLabel: "Women's Development Score",
      secondaryMetricValue: womenScore,
      severity: "yellow"
    });
  }

  return paradoxes;
}
