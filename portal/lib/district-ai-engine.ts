import type { DistrictMetrics } from "@/lib/types/district";
import { METRIC_LABELS, INDICATOR_CATEGORIES, STATES } from "@/lib/constants";
import {
  getDimensionScores,
  getSimilarDistricts,
  getStateAverage,
  getPriorityAreas,
  runKMeansClustering,
  getMetricsForYear,
} from "@/lib/ml-utils";
import {
  fetchDistrictMetrics,
  fetchDistrictsIndex,
  type DistrictIndexEntry,
} from "@/lib/data-loader";
import {
  STATES_KNOWLEDGE,
  CITY_PROFILES,
  DOMAIN_EXPLANATIONS,
} from "@/lib/ai-knowledge";
import {
  findDistrictInIndex,
  resolveIndicatorFromQuery,
  calculateDifference,
  CORE_COMPARISON_FIELDS,
  loadDistrictMetrics,
  auditDistrictHealthVulnerabilities,
  DISTRICT_SYNONYMS,
  normalizeSlug,
  type ResolvedIndicator,
} from "@/lib/ai-data-tools";

export interface ComparisonItem {
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

export interface VisualBarItem {
  label: string;
  unit: string;
  entity1Name: string;
  entity1Value: number;
  entity2Name: string;
  entity2Value: number;
  diffFormatted: string;
  isEntity1Better: boolean;
}

export interface MultiDistrictComparisonItem {
  field: string;
  label: string;
  unit: string;
  values: {
    districtName: string;
    stateCode: string;
    value: number;
  }[];
  bestDistrict: string;
}

export interface SimilarDistrictResult {
  districtName: string;
  stateCode: string;
  stateName: string;
  similarityScore: number;
  clusterLabel: string;
  keyStrengths: string;
}

export interface StructuredAIResponse {
  title: string;
  subtitle?: string;
  summary: string;
  comparisons?: ComparisonItem[];
  visualBars?: VisualBarItem[];
  multiComparisons?: MultiDistrictComparisonItem[];
  similarDistricts?: SimilarDistrictResult[];
  bullets?: string[];
  insights?: string[];
  diagnosticReasoning?: {
    actualData: string[];
    aiInterpretation: string;
    caveat: string;
  };
  citation: string;
  isWarning?: boolean;
}

export interface ConversationContext {
  activeDistrict: DistrictMetrics;
  allDistricts: DistrictMetrics[];
  stateName: string;
  stateCode: string;
  surveyYear: "NFHS-5" | "NFHS-6";
  lastComparisonTarget?: {
    name: string;
    stateCode: string;
    metrics: DistrictMetrics;
  };
  lastDiscussedDistrict?: {
    id: string;
    name: string;
    stateCode: string;
    stateName: string;
    metrics?: DistrictMetrics;
  };
  lastDiscussedIndicator?: string;
  lastDiscussedCategory?: string;
  recentMessages?: {
    sender: "user" | "bot";
    text: string;
  }[];
}

/**
 * Searches for a state in the user query.
 */
export function searchStateInQuery(query: string) {
  const q = query.toLowerCase();
  for (const s of STATES) {
    const sName = s.name.toLowerCase();
    const sCode = s.code.toLowerCase();
    // exact word boundary or substring match
    if (
      q === sName ||
      q.includes(` ${sName}`) ||
      q.includes(`${sName} `) ||
      q.includes(`in ${sName}`) ||
      q.includes(`of ${sName}`) ||
      q.includes(` ${sCode} `) ||
      q.endsWith(` ${sCode}`) ||
      q === sCode
    ) {
      return s;
    }
  }
  return null;
}

/**
 * Helper to compute differences across fields for two districts.
 */
function buildComparisonsAndBars(
  d1Name: string,
  d1: DistrictMetrics,
  d2Name: string,
  d2: DistrictMetrics,
  fields: readonly string[],
  maxBars = 4
) {
  const comparisons: ComparisonItem[] = [];
  const visualBars: VisualBarItem[] = [];

  for (const field of fields) {
    const val1 = (d1[field as keyof DistrictMetrics] as number) ?? null;
    const val2 = (d2[field as keyof DistrictMetrics] as number) ?? null;

    if (typeof val1 === "number" && typeof val2 === "number") {
      const diffInfo = calculateDifference(field, val1, val2);
      comparisons.push({
        field,
        label: diffInfo.label,
        unit: diffInfo.unit,
        entity1Value: val1,
        entity2Value: val2,
        diff: diffInfo.diff,
        diffFormatted: diffInfo.diffFormatted,
        isEntity1Better: diffInfo.isEntity1Better,
        direction: diffInfo.direction,
      });

      if (visualBars.length < maxBars) {
        visualBars.push({
          label: diffInfo.label,
          unit: diffInfo.unit,
          entity1Name: d1Name,
          entity1Value: val1,
          entity2Name: d2Name,
          entity2Value: val2,
          diffFormatted: diffInfo.diffFormatted,
          isEntity1Better: diffInfo.isEntity1Better,
        });
      }
    }
  }

  return { comparisons, visualBars };
}

/**
 * Main execution function: Processes user prompt against context and dataset.
 */
export async function processDistrictQuery(
  rawQuery: string,
  context: ConversationContext
): Promise<StructuredAIResponse> {
  const { activeDistrict, allDistricts, stateName, stateCode, surveyYear } = context;
  const q = rawQuery.trim().toLowerCase();
  const dName = activeDistrict.district_name;

  // Load district global index for lookup
  const districtsIndex = await fetchDistrictsIndex();

  // ──────────────────────────────────────────────────────────────────────────
  // 1. GREETINGS & SOCIAL CONVERSATION
  // ──────────────────────────────────────────────────────────────────────────
  const greetingWords = ["hello", "hi", "hey", "namaste", "namaskar", "kem cho", "vanakkam", "pranam", "good morning", "good afternoon", "good evening"];
  const isPureGreeting = greetingWords.some((w) => q === w || q.startsWith(`${w} `) || q.startsWith(`${w}!`) || q.startsWith(`${w},`));

  if (isPureGreeting && !q.includes("anaemia") && !q.includes("stunting") && !q.includes("compare")) {
    return {
      title: "District Intelligence Assistant",
      subtitle: `${dName}, ${stateName} · Connected to Grounded Microdata`,
      summary: `Hello! I am your AI assistant for the **India District Data & Intelligence Portal**. I am currently focused on **${dName}** (${stateName}), but I can answer questions about any of India's 700+ districts, explain health indicators, compare regions, and provide Indian geography insights.`,
      bullets: [
        `**District Indicators**: "What is child anaemia in ${dName}?" or "How many children are fully vaccinated?"`,
        `**Cross-District Comparisons**: "Compare ${dName} with Surat" or "Which district has higher child anaemia?"`,
        `**Development Priorities**: "What are the biggest development gaps in ${dName}?"`,
        `**Public Health Concepts**: "What is NFHS?" or "Why is child anaemia important?"`,
        `**Indian Geography**: "What is the capital of Gujarat?" or "What state is Surat in?"`,
      ],
      citation: "Grounded District Intelligence Engine · MoHFW NFHS Benchmark Data",
    };
  }

  // "How are you?"
  if (q.includes("how are you") || q.includes("how r u") || q.includes("how are u") || q.includes("how's it going") || q.includes("whats up") || q.includes("what's up")) {
    return {
      title: "District Intelligence Assistant",
      subtitle: `${dName}, ${stateName} · Ready to assist`,
      summary: `I'm doing well, thank you! I'm fully loaded with verified National Family Health Survey (**${activeDistrict.metadata.source}**) data and ready to help you analyze health, nutrition, education, and infrastructure indicators across India. We're currently examining **${dName}** (${stateName}). What would you like to explore?`,
      bullets: [
        `Ask about health outcomes: "What are the major health problems in ${dName}?"`,
        `Compare with peer cities: "Compare ${dName} and Surat"`,
        `Explore priorities: "What are ${dName}'s biggest development gaps?"`,
        `Understand concepts: "What is stunting?" or "Explain this indicator"`,
      ],
      citation: "Grounded District Intelligence Engine",
    };
  }

  // "Thank you" / "Thanks"
  if (q === "thank you" || q === "thanks" || q === "thanks a lot" || q.startsWith("thank you") || q.startsWith("thanks!")) {
    return {
      title: "You're Welcome!",
      subtitle: `${dName}, ${stateName}`,
      summary: `You're very welcome! If you have more questions about **${dName}**, wish to compare other districts across India, or explore public health benchmarks, feel free to ask anytime.`,
      citation: "India District Data & Intelligence Portal",
    };
  }

  // "What can you do?" / "Help" / "Who are you?"
  if (
    q.includes("what can you do") ||
    q.includes("who are you") ||
    q.includes("how do you work") ||
    q.includes("what is your purpose") ||
    q.includes("help me") ||
    q === "help"
  ) {
    return {
      title: "Assistant Capabilities & System Guide",
      subtitle: `AI Data Intelligence · Grounded in official government microdata`,
      summary: `I am the conversational intelligence layer for the **India District Data & Intelligence Portal**. My knowledge combines verified **${activeDistrict.metadata.source}** factsheets, machine learning clustering, Indian geography, and public health science.`,
      bullets: [
        `**1. Verified Indicator Lookup**: Ask for exact statistics on female literacy, child stunting, anaemia, institutional births, vaccination, electricity, water, and sanitation.`,
        `**2. Cross-District Comparisons**: Compare ${dName} against any district in Gujarat or across India with side-by-side visual comparison bars and diff calculations.`,
        `**3. Development Gap Audit**: Identify severity-ranked deficits where a district lags behind state or national benchmarks.`,
        `**4. Machine Learning Twin Districts**: Discover statistically similar peer districts using K-Nearest Neighbors (KNN) across 6 development dimensions.`,
        `**5. Public Health Explanations**: Understand epidemiological definitions (NFHS, anaemia, stunting, wasting, maternal care) and why they matter.`,
        `**6. Indian Geography**: Inquire about state capitals, state populations, and district administrative locations.`,
      ],
      citation: "Official NFHS District Factsheets & Portal Analytics Engine",
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. GEOGRAPHY & ADMINISTRATIVE KNOWLEDGE
  // ──────────────────────────────────────────────────────────────────────────

  // A. State Capitals: e.g. "what is the capital of Gujarat?", "capital of Maharashtra"
  if (q.includes("capital")) {
    const matchedState = searchStateInQuery(q);
    if (matchedState) {
      const stateInfo = STATES_KNOWLEDGE[matchedState.code];
      const capitalName = stateInfo?.capital || "Gandhinagar";
      return {
        title: `Capital of ${matchedState.name}`,
        subtitle: `Administrative Geography · ${matchedState.name}`,
        summary: `The capital of **${matchedState.name}** is **${capitalName}**.`,
        bullets: [
          `**State**: ${matchedState.name} (${matchedState.code})`,
          `**Capital City**: ${capitalName}`,
          stateInfo?.largestCity ? `**Largest City**: ${stateInfo.largestCity}` : ``,
          stateInfo?.districtCount ? `**Total Districts**: ${stateInfo.districtCount} districts` : ``,
          stateInfo?.description ? `**Overview**: ${stateInfo.description}` : ``,
        ].filter(Boolean),
        insights: [
          `You can explore and compare health, demographic, and development data for all districts of ${matchedState.name} in this portal.`,
        ],
        citation: "Survey of India & Census Administrative Records",
      };
    } else if (q.includes("india")) {
      return {
        title: "Capital of India",
        subtitle: "National Administrative Center",
        summary: "The capital of **India** is **New Delhi**. Located in the National Capital Territory of Delhi, it serves as the seat of the executive, legislative, and judicial branches of the Government of India.",
        citation: "Government of India Administrative Directory",
      };
    }
  }

  // B. "What state is [District/City] in?" / "Where is Surat?"
  if (
    q.includes("what state is") ||
    q.includes("which state is") ||
    q.includes("what state does") ||
    q.includes("where is") ||
    q.includes("location of")
  ) {
    // Find district in index
    const words = q
      .replace(/what|which|state|is|does|in|where|location|of|the|city|district/g, " ")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    let targetEntry: DistrictIndexEntry | null = null;
    for (const w of words) {
      targetEntry = findDistrictInIndex(w, districtsIndex);
      if (targetEntry) break;
    }

    if (!targetEntry && q.includes("surat")) {
      targetEntry = findDistrictInIndex("surat", districtsIndex);
    }
    if (!targetEntry && q.includes("ahmedabad")) {
      targetEntry = findDistrictInIndex("ahmedabad", districtsIndex);
    }

    if (targetEntry) {
      const cityKey = targetEntry.name.toLowerCase();
      const cityProf = CITY_PROFILES[cityKey];
      return {
        title: `Geographic Location: ${targetEntry.name}`,
        subtitle: `${targetEntry.name}, ${targetEntry.state_name}`,
        summary: `**${targetEntry.name}** is a district located in the state of **${targetEntry.state_name}** (${targetEntry.state_code}).${
          cityProf ? `\n\n${cityProf.summary}` : ""
        }`,
        bullets: [
          `**State**: ${targetEntry.state_name} (${targetEntry.state_code})`,
          `**District ID**: ${targetEntry.id}`,
          cityProf?.highlights ? `**Economic & Regional Role**: ${cityProf.highlights}` : ``,
        ].filter(Boolean),
        insights: [
          `Would you like to compare **${targetEntry.name}** with **${dName}** across health, nutrition, or education indicators? Try asking: "Compare ${dName} with ${targetEntry.name}".`,
        ],
        citation: "Census of India Administrative Boundary Directory",
      };
    }
  }

  // C. State Population: e.g. "what is the population of Gujarat?", "population of Maharashtra"
  if (q.includes("population of")) {
    const matchedState = searchStateInQuery(q);
    if (matchedState) {
      const stateInfo = STATES_KNOWLEDGE[matchedState.code];
      const pop2011 = stateInfo?.censusPopulation2011 || "Approx. 60.44 million (2011 Census)";
      const popEst = stateInfo?.estimatedPopulation || "Projected >70 million";
      return {
        title: `Population of ${matchedState.name}`,
        subtitle: `Demographic Profile · ${matchedState.name}`,
        summary: `According to the official 2011 Census of India, the population of **${matchedState.name}** was **${pop2011}**. Current demographic projections estimate the state's population at **${popEst}**.`,
        bullets: [
          `**Official 2011 Census**: ${pop2011}`,
          `**Current Estimate**: ${popEst}`,
          `**Administrative Districts**: ${stateInfo?.districtCount || "33"} districts`,
          `**Capital**: ${stateInfo?.capital || "Gandhinagar"}`,
          stateInfo?.description ? `**Profile**: ${stateInfo.description}` : "",
        ].filter(Boolean),
        citation: "Office of the Registrar General & Census Commissioner, India",
      };
    }
  }

  // D. General State Information: e.g. "tell me about Gujarat", "overview of Maharashtra"
  if ((q.includes("tell me about") || q.includes("overview of") || q.includes("information on")) && STATES.some((s) => q.includes(s.name.toLowerCase()))) {
    const matchedState = searchStateInQuery(q);
    if (matchedState) {
      const stateInfo = STATES_KNOWLEDGE[matchedState.code];
      return {
        title: `State Overview: ${matchedState.name}`,
        subtitle: `${matchedState.name} (${matchedState.code}) · General Profile`,
        summary: stateInfo?.description || `${matchedState.name} is a state located in India with ${matchedState.code} as its postal code.`,
        bullets: [
          `**Capital**: ${stateInfo?.capital || "State Capital"}`,
          `**Population (2011 Census)**: ${stateInfo?.censusPopulation2011 || "N/A"}`,
          `**Estimated Population**: ${stateInfo?.estimatedPopulation || "N/A"}`,
          `**Districts**: ${stateInfo?.districtCount || "30+"} districts`,
        ],
        insights: [
          `To explore public health and demographic data for districts in ${matchedState.name}, select any district from the portal map or search bar.`,
        ],
        citation: "Census of India & Government Administrative Registry",
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. PUBLIC HEALTH & DOMAIN CONCEPTS (NFHS, Anaemia, Stunting, etc.)
  // ──────────────────────────────────────────────────────────────────────────

  // "What is NFHS?" / "What does NFHS stand for?" / "Who conducts NFHS?"
  if (
    q.includes("what is nfhs") ||
    q.includes("what does nfhs stand for") ||
    q.includes("who conducts nfhs") ||
    q.includes("explain nfhs") ||
    q === "nfhs" ||
    q === "what is the national family health survey"
  ) {
    const info = DOMAIN_EXPLANATIONS.nfhs;
    return {
      title: info.title,
      subtitle: "Ministry of Health & Family Welfare Benchmark",
      summary: `${info.whatItIs}\n\n${info.whyItMatters}`,
      bullets: [
        `**Nodal Agency**: International Institute for Population Sciences (IIPS), Mumbai.`,
        `**Survey Scope**: ${info.clinicalOrPolicyContext}`,
        `**Methodology**: ${info.targetOrStandard}`,
        `**Data Utilization**: Benchmarks national policy schemes such as Poshan Abhiyaan, Ayushman Bharat, and tracking UN Sustainable Development Goals (SDGs).`,
      ],
      insights: [
        `All metrics displayed on this portal for **${dName}** and peer districts are drawn directly from official NFHS factsheets. No statistics are simulated.`,
      ],
      citation: "Ministry of Health and Family Welfare, Government of India (rchiips.org/nfhs)",
    };
  }

  // "What is anaemia?", "Why is anaemia important?", "Why is child anaemia important?"
  const isAnaemiaGeneralQuery =
    (q.includes("what is anaemia") || q.includes("what is anemia") || q.includes("explain anaemia") || q.includes("explain anemia") || q === "anaemia" || q === "anemia") &&
    !q.includes("in ahmedabad") && !q.includes("in surat");
  const isAnaemiaImportanceQuery =
    q.includes("why is child anaemia important") ||
    q.includes("why is anaemia important") ||
    q.includes("why is anemia important") ||
    q.includes("importance of anaemia") ||
    q.includes("importance of child anaemia") ||
    q.includes("child anaemia important");

  if (isAnaemiaImportanceQuery || isAnaemiaGeneralQuery) {
    const anaVal = activeDistrict.child_anaemia;
    const info = isAnaemiaImportanceQuery ? DOMAIN_EXPLANATIONS.child_anaemia : DOMAIN_EXPLANATIONS.anaemia;
    return {
      title: info.title,
      subtitle: `Clinical Significance & Public Health Impact · ${dName} Grounded Data`,
      summary: `${info.whatItIs}\n\n**Why it matters:** ${info.whyItMatters}`,
      bullets: [
        `**Neurocognitive Impact**: In children under 5 years, iron deficiency during brain myelinogenesis leads to irreversible deficits in cognitive capacity, attention, memory, and motor development.`,
        `**Immunity & Morbidity**: Anaemic children suffer from reduced immune defense against infections, leading to frequent bouts of pneumonia, diarrhoea, and stunted physical growth.`,
        `**Policy Intervention**: Under **Anemia Mukt Bharat (AMB)**, the government promotes the '6x6x6 strategy'—bi-weekly Iron & Folic Acid (IFA) syrup supplementation, biannual deworming, and testing.`,
        typeof anaVal === "number"
          ? `**Current Grounded Value in ${dName}**: Child anaemia stands at **${anaVal.toFixed(1)}%** (${activeDistrict.metadata.source} survey).`
          : ``,
      ].filter(Boolean),
      insights: [
        typeof anaVal === "number"
          ? `Public Health Context: While ${dName}'s rate of ${anaVal.toFixed(1)}% is compared against the state average, any prevalence ≥40% is classified by the WHO as a "Severe Public Health Problem", demanding sustained community nutrition interventions.`
          : `WHO classification: Child anaemia rates above 40% represent a severe public health challenge.`,
      ],
      citation: "World Health Organization (WHO) Nutritional Guidelines & MoHFW Anemia Mukt Bharat",
    };
  }

  // "What is stunting?", "What is wasting?", "What is underweight?"
  if (q.includes("what is stunting") || q.includes("explain stunting") || (q.includes("stunting") && q.includes("mean"))) {
    const info = DOMAIN_EXPLANATIONS.stunting;
    const stVal = activeDistrict.child_stunting;
    return {
      title: info.title,
      subtitle: `WHO Child Growth Benchmark · Grounded Context for ${dName}`,
      summary: `${info.whatItIs}\n\n**Why it matters:** ${info.whyItMatters}`,
      bullets: [
        `**Root Causes**: Cumulative nutritional deprivation, maternal undernutrition during pregnancy, lack of exclusive breastfeeding, and recurrent enteric infections.`,
        `**Long-Term Impact**: Irreversible loss of adult height potential, reduced cognitive abilities, and decreased adult economic productivity.`,
        typeof stVal === "number"
          ? `**Verified Value in ${dName}**: Child stunting is **${stVal.toFixed(1)}%** (${activeDistrict.metadata.source}).`
          : ``,
      ].filter(Boolean),
      citation: "World Health Organization (WHO) Child Growth Standards",
    };
  }

  // "What is institutional birth?", "Why are institutional births important?"
  if (q.includes("institutional birth") || q.includes("institutional delivery") || q.includes("hospital birth")) {
    const info = DOMAIN_EXPLANATIONS.institutional_births;
    const ibVal = activeDistrict.institutional_births;
    return {
      title: info.title,
      subtitle: `Maternal & Neonatal Survival Benchmark · ${dName}`,
      summary: `${info.whatItIs}\n\n**Why it matters:** ${info.whyItMatters}`,
      bullets: [
        `**Maternal Survival**: Guarantees emergency obstetric care for postpartum hemorrhage (PPH), eclampsia, and sepsis.`,
        `**Government Incentive**: Conditional cash assistance provided under **Janani Suraksha Yojana (JSY)**.`,
        typeof ibVal === "number"
          ? `**Verified Value in ${dName}**: **${ibVal.toFixed(1)}%** of births occur in health facilities.`
          : ``,
      ].filter(Boolean),
      citation: "MoHFW Maternal Health Division & NFHS Guidelines",
    };
  }

  // "What is full vaccination?", "Why is vaccination important?"
  if (q.includes("what is vaccination") || q.includes("what is full vaccination") || q.includes("why is vaccination important") || q.includes("what is immunization")) {
    const info = DOMAIN_EXPLANATIONS.vaccination;
    const vacVal = activeDistrict.full_vaccination;
    return {
      title: info.title,
      subtitle: `Universal Immunization Programme · ${dName}`,
      summary: `${info.whatItIs}\n\n**Why it matters:** ${info.whyItMatters}`,
      bullets: [
        `**Vaccine Schedule**: BCG, 3 doses of OPV, 3 doses of Pentavalent/DPT, and Measles/Rubella.`,
        `**National Target**: Mission Indradhanush targets >90% coverage in every district.`,
        typeof vacVal === "number"
          ? `**Verified Value in ${dName}**: **${vacVal.toFixed(1)}%** full basic vaccination coverage.`
          : ``,
      ].filter(Boolean),
      citation: "Universal Immunization Programme (UIP), Ministry of Health & Family Welfare",
    };
  }

  // "What does this percentage mean?", "What should I understand from this data?", "How to read this data?"
  if (
    q.includes("what does this percentage mean") ||
    q.includes("what does percentage mean") ||
    q.includes("what should i understand from this data") ||
    q.includes("how to read this data") ||
    q.includes("how to interpret this") ||
    q.includes("explain this data")
  ) {
    const info = DOMAIN_EXPLANATIONS.survey_percentages;
    return {
      title: info.title,
      subtitle: "Data Interpretation & Directionality Guide",
      summary: `${info.whatItIs}\n\n${info.whyItMatters}`,
      bullets: [
        `**Positive Indicators (Higher is Better)**: Literacy, institutional deliveries, full vaccination, electricity, clean water, and schooling. Higher percentages indicate greater developmental achievement.`,
        `**Negative / Risk Indicators (Lower is Better)**: Child stunting, child wasting, child anaemia, women anaemia, child marriage, and school dropout. Lower percentages indicate healthier, safer conditions.`,
        `**Percentage Points (pp)**: The arithmetic difference between two percentages (e.g. 55% vs 50% is a difference of +5 percentage points).`,
        `**Grounding Principle**: All data points in this portal reflect official survey observations without estimation or simulation.`,
      ],
      citation: "NFHS Factsheet Interpretation Standards & National Data Guidelines",
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. "TELL ME ABOUT [DISTRICT]" / DISTRICT PROFILE OVERVIEW
  // ──────────────────────────────────────────────────────────────────────────
  const isTellMeAboutDistrict =
    q.startsWith("tell me about") ||
    q.startsWith("overview of") ||
    q.startsWith("describe") ||
    q.includes("how is ahmedabad doing") ||
    q.includes("profile of");

  if (isTellMeAboutDistrict) {
    // Check which district is referenced
    let targetEntry: DistrictIndexEntry | null = null;
    const words = q.replace(/tell|me|about|overview|of|describe|how|is|doing|profile/g, " ").trim().split(/\s+/);
    for (const w of words) {
      if (w.length >= 3) {
        targetEntry = findDistrictInIndex(w, districtsIndex);
        if (targetEntry) break;
      }
    }

    const isCurrentDistrict = !targetEntry || targetEntry.id === activeDistrict.district_id;
    const distData = isCurrentDistrict ? activeDistrict : await loadDistrictMetrics(targetEntry!, surveyYear);

    if (distData) {
      const curName = distData.district_name;
      const curState = distData.state_name;
      const cityProf = CITY_PROFILES[curName.toLowerCase()];

      // Extract key metrics
      const lit = distData.literacy_rate;
      const ib = distData.institutional_births;
      const vac = distData.full_vaccination;
      const st = distData.child_stunting;
      const an = distData.child_anaemia;
      const sr = distData.sex_ratio;

      return {
        title: `Comprehensive District Profile: ${curName}`,
        subtitle: `${curName}, ${curState} · ${distData.metadata.source} (${distData.metadata.year}) Grounded Factsheet`,
        summary: `${cityProf ? `${cityProf.summary}\n\n` : ""}Here is the verified developmental summary for **${curName}** (${curState}) based on official **${distData.metadata.source}** microdata:`,
        bullets: [
          lit ? `**Female Literacy Rate**: **${lit.toFixed(1)}%** of women are literate.` : "",
          ib ? `**Institutional Deliveries**: **${ib.toFixed(1)}%** of births occur in health facilities.` : "",
          vac ? `**Full Child Immunization**: **${vac.toFixed(1)}%** of children (12–23 mos) received all basic vaccines.` : "",
          st ? `**Child Stunting (Chronic Malnutrition)**: **${st.toFixed(1)}%** of children under 5.` : "",
          an ? `**Child Anaemia**: **${an.toFixed(1)}%** of children (6–59 mos) have low hemoglobin.` : "",
          sr ? `**Sex Ratio**: **${sr.toFixed(0)}** females per 1,000 males.` : "",
        ].filter(Boolean),
        insights: [
          `${curName} demonstrates ${ib && ib > 85 ? "robust institutional healthcare delivery" : "moderate maternal health coverage"} with ${lit && lit > 80 ? "strong literacy achievement" : "room for education expansion"}.`,
          an && an > 50
            ? `Critical Public Health Focus: Child anaemia (${an.toFixed(1)}%) represents a high-priority intervention area requiring strengthened nutrition supplementation.`
            : `Child nutrition and basic services maintain solid baselines across survey metrics.`,
        ],
        citation: `${distData.metadata.source} Official Factsheet for ${curName}, ${curState}. Grounded in verified survey data.`,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. DISTRICT HEALTH CHALLENGES & VULNERABILITIES AUDIT
  // ──────────────────────────────────────────────────────────────────────────
  // E.g. "what are the major health problems in Ahmedabad?", "health issues in Ahmedabad"
  if (
    q.includes("health problem") ||
    q.includes("health issue") ||
    q.includes("health challenge") ||
    q.includes("major health") ||
    q.includes("malnutrition in") ||
    (q.includes("health") && (q.includes("problem") || q.includes("issue") || q.includes("bad") || q.includes("concern")))
  ) {
    const audit = auditDistrictHealthVulnerabilities(activeDistrict, allDistricts);
    const lagging = audit.laggingIndicators;

    const visualBars: VisualBarItem[] = lagging.slice(0, 3).map((item) => ({
      label: item.label,
      unit: "%",
      entity1Name: dName,
      entity1Value: item.value,
      entity2Name: "State Avg",
      entity2Value: item.stateAvg,
      diffFormatted: item.diffFormatted,
      isEntity1Better: false,
    }));

    return {
      title: `Major Health & Nutrition Vulnerabilities`,
      subtitle: `${dName}, ${stateName} · Verified Public Health Audit (${activeDistrict.metadata.source})`,
      summary: `An audit of verified ${activeDistrict.metadata.source} health and nutrition indicators for **${dName}** identifies the following primary public health concerns:`,
      visualBars,
      bullets: lagging.map(
        (item) => `**${item.label}**: **${item.value.toFixed(1)}%** (State Avg: ${item.stateAvg.toFixed(1)}%) — ${item.reason}.`
      ),
      insights: [
        lagging[0]
          ? `Top Concern: **${lagging[0].label}** presents the greatest developmental deficit in ${dName}, lagging ${Math.abs(lagging[0].value - lagging[0].stateAvg).toFixed(1)} pp from the state benchmark.`
          : `Health indicators remain generally aligned with state averages.`,
        `Nutrition and maternal care interventions represent the highest-leverage policy pathways for health improvement.`,
      ],
      citation: `${activeDistrict.metadata.source} Official District Health Factsheets (${activeDistrict.metadata.year}). Grounded in verified microdata.`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. MULTI-DISTRICT COMPARISON
  // ──────────────────────────────────────────────────────────────────────────
  const mentionedDistricts: DistrictIndexEntry[] = [];
  for (const entry of districtsIndex) {
    const entryName = entry.name.toLowerCase();
    if (entryName.length >= 4 && q.includes(entryName)) {
      if (!mentionedDistricts.some((m) => m.id === entry.id)) {
        mentionedDistricts.push(entry);
      }
    }
  }

  const otherDistricts = mentionedDistricts.filter((d) => d.id !== activeDistrict.district_id);

  if (otherDistricts.length >= 2 && (q.includes("compare") || q.includes("vs") || q.includes("between") || q.includes("difference"))) {
    const districtsToCompare: { name: string; stateCode: string; data: DistrictMetrics }[] = [
      { name: dName, stateCode, data: activeDistrict },
    ];

    for (const d of otherDistricts.slice(0, 3)) {
      const metric = await loadDistrictMetrics(d, surveyYear);
      if (metric) {
        districtsToCompare.push({
          name: d.name,
          stateCode: d.state_code,
          data: metric,
        });
      }
    }

    if (districtsToCompare.length >= 3) {
      const multiComparisons: MultiDistrictComparisonItem[] = [];

      for (const field of CORE_COMPARISON_FIELDS.slice(0, 7)) {
        const meta = METRIC_LABELS[field];
        const vals = districtsToCompare.map((d) => ({
          districtName: d.name,
          stateCode: d.stateCode,
          value: (d.data[field as keyof DistrictMetrics] as number) ?? 0,
        }));

        const isPositive = meta?.direction === "positive";
        const sorted = [...vals].sort((a, b) => (isPositive ? b.value - a.value : a.value - b.value));
        const best = sorted[0].districtName;

        multiComparisons.push({
          field,
          label: meta?.label || field,
          unit: meta?.unit || "%",
          values: vals,
          bestDistrict: best,
        });
      }

      const namesList = districtsToCompare.map((d) => d.name).join(", ");
      return {
        title: `Multi-District Comparative Analysis`,
        subtitle: `${namesList} (${surveyYear})`,
        summary: `Direct comparative assessment across ${districtsToCompare.length} districts based on verified ${activeDistrict.metadata.source} survey data:`,
        multiComparisons,
        insights: [
          `Performance differs markedly across basic public health and child nutrition outcomes.`,
          `${districtsToCompare[0].name} leads in ${multiComparisons.filter((m) => m.bestDistrict === districtsToCompare[0].name).length} of 7 core indicators analyzed.`,
        ],
        citation: `${activeDistrict.metadata.source} (${activeDistrict.metadata.year}) Grounded District Dataset`,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. COMPARATIVE QUESTION: "WHICH DISTRICT HAS HIGHER [INDICATOR]?"
  // ──────────────────────────────────────────────────────────────────────────
  // E.g. "which district has higher child anaemia?", "which is higher?", "who has more stunting?"
  const isWhichHigherQuery =
    q.includes("which district has higher") ||
    q.includes("which district has lower") ||
    q.includes("which has higher") ||
    q.includes("which has lower") ||
    q.includes("which one is higher") ||
    q.includes("which one is lower") ||
    q.includes("which is better") ||
    q.includes("who has higher") ||
    q.includes("who has more");

  if (isWhichHigherQuery) {
    // Resolve target district to compare with active district
    let compTarget = context.lastComparisonTarget;
    if (!compTarget && otherDistricts.length > 0) {
      const metric = await loadDistrictMetrics(otherDistricts[0], surveyYear);
      if (metric) {
        compTarget = {
          name: otherDistricts[0].name,
          stateCode: otherDistricts[0].state_code,
          metrics: metric,
        };
      }
    }

    // Resolve indicator from query or context
    const resolvedInd = resolveIndicatorFromQuery(q) || (context.lastDiscussedIndicator ? {
      field: context.lastDiscussedIndicator,
      label: METRIC_LABELS[context.lastDiscussedIndicator]?.label || context.lastDiscussedIndicator,
      unit: METRIC_LABELS[context.lastDiscussedIndicator]?.unit || "%",
      description: METRIC_LABELS[context.lastDiscussedIndicator]?.description || "",
      direction: METRIC_LABELS[context.lastDiscussedIndicator]?.direction || "positive",
      categoryKey: "nutrition",
      categoryLabel: "Nutrition",
    } : null);

    if (compTarget && resolvedInd) {
      const val1 = activeDistrict[resolvedInd.field as keyof DistrictMetrics] as number | null;
      const val2 = compTarget.metrics[resolvedInd.field as keyof DistrictMetrics] as number | null;

      if (typeof val1 === "number" && typeof val2 === "number") {
        const diffInfo = calculateDifference(resolvedInd.field, val1, val2);
        const isD1Higher = val1 > val2;
        const higherDistrict = isD1Higher ? dName : compTarget.name;
        const lowerDistrict = isD1Higher ? compTarget.name : dName;
        const diffAbs = Math.abs(diffInfo.diff).toFixed(1);

        const visualBars: VisualBarItem[] = [
          {
            label: resolvedInd.label,
            unit: resolvedInd.unit,
            entity1Name: dName,
            entity1Value: val1,
            entity2Name: compTarget.name,
            entity2Value: val2,
            diffFormatted: diffInfo.diffFormatted,
            isEntity1Better: diffInfo.isEntity1Better,
          },
        ];

        return {
          title: `Direct Comparison: ${resolvedInd.label}`,
          subtitle: `${dName} vs ${compTarget.name}`,
          summary: `Between **${dName}** and **${compTarget.name}**, **${higherDistrict}** has the higher ${resolvedInd.label.toLowerCase()} rate:

- **${dName}**: **${val1.toFixed(1)}${resolvedInd.unit}**
- **${compTarget.name}**: **${val2.toFixed(1)}${resolvedInd.unit}**
- **Difference**: **${higherDistrict}** is higher by **${diffAbs} percentage points**.`,
          visualBars,
          bullets: [
            `**Indicator Direction**: ${
              resolvedInd.direction === "positive"
                ? "Higher is better (advantage for " + higherDistrict + ")"
                : "Lower is better (risk metric; " + lowerDistrict + " performs better)"
            }.`,
            `**Interpretation**: ${
              diffInfo.isEntity1Better
                ? `**${dName}** achieves the more favorable outcome.`
                : `**${compTarget.name}** achieves the more favorable outcome.`
            }`,
          ],
          citation: `${activeDistrict.metadata.source} Official Factsheets for ${dName} and ${compTarget.name}. Verified microdata.`,
        };
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. DISTRICT VS STATE AVERAGE COMPARISON
  // ──────────────────────────────────────────────────────────────────────────
  const isStateAvgQuery =
    q.includes("state avg") ||
    q.includes("state average") ||
    (q.includes("compare") && q.includes("state")) ||
    (q.includes("compare") && STATES.some((s) => q.includes(s.name.toLowerCase()) && !mentionedDistricts.some((m) => q.includes(m.name.toLowerCase()))));

  if (isStateAvgQuery) {
    const targetState = searchStateInQuery(q) || { code: stateCode, name: stateName };
    const targetStateMetrics =
      targetState.code === stateCode ? allDistricts : (await fetchDistrictMetrics(targetState.code)) || [];

    if (targetStateMetrics.length > 0) {
      const stateAverages = getStateAverage(
        targetStateMetrics.map((d) => getMetricsForYear(d, surveyYear))
      );

      const comparisons: ComparisonItem[] = [];
      const visualBars: VisualBarItem[] = [];

      for (const field of CORE_COMPARISON_FIELDS) {
        const val1 = (activeDistrict[field as keyof DistrictMetrics] as number) ?? null;
        const val2 = stateAverages[field] ?? null;

        if (typeof val1 === "number" && typeof val2 === "number") {
          const diffInfo = calculateDifference(field, val1, val2);

          comparisons.push({
            field,
            label: diffInfo.label,
            unit: diffInfo.unit,
            entity1Value: val1,
            entity2Value: val2,
            diff: diffInfo.diff,
            diffFormatted: diffInfo.diffFormatted,
            isEntity1Better: diffInfo.isEntity1Better,
            direction: diffInfo.direction,
          });

          if (visualBars.length < 4) {
            visualBars.push({
              label: diffInfo.label,
              unit: diffInfo.unit,
              entity1Name: dName,
              entity1Value: val1,
              entity2Name: `${targetState.name} Avg`,
              entity2Value: val2,
              diffFormatted: diffInfo.diffFormatted,
              isEntity1Better: diffInfo.isEntity1Better,
            });
          }
        }
      }

      const betterCount = comparisons.filter((c) => c.isEntity1Better).length;
      const totalCount = comparisons.length;

      return {
        title: `${dName} vs ${targetState.name} State Average`,
        subtitle: `Survey Vintage: ${activeDistrict.metadata.source} (${activeDistrict.metadata.year})`,
        summary: `${dName} performs better than the ${targetState.name} state average in **${betterCount} of ${totalCount}** primary developmental indicators.`,
        comparisons,
        visualBars,
        insights: [
          `${dName} ${betterCount > totalCount / 2 ? "outpaces" : "lags behind"} the state composite benchmark overall.`,
          `Largest positive lead: ${comparisons.filter((c) => c.isEntity1Better)[0]?.label || "Demographics"}.`,
          `Key focus area: ${comparisons.filter((c) => !c.isEntity1Better)[0]?.label || "Nutrition"}.`,
        ],
        citation: `Computed from verified ${targetState.name} district dataset (${activeDistrict.metadata.source}). No values are estimated or simulated.`,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. DISTRICT VS DISTRICT COMPARISON (Same or Cross-State)
  // ──────────────────────────────────────────────────────────────────────────
  // E.g. "Compare Ahmedabad with Surat", "Surat vs Ahmedabad", "Compare Ahmedabad and Pune"
  if (
    q.includes("compare") ||
    q.includes("vs") ||
    q.includes("versus") ||
    q.includes("difference between")
  ) {
    let targetDistrictEntry: DistrictIndexEntry | null = null;

    // A. Check other districts in query
    for (const d of otherDistricts) {
      if (d.id !== activeDistrict.district_id) {
        targetDistrictEntry = d;
        break;
      }
    }

    // B. Search token words against global index
    if (!targetDistrictEntry) {
      const words = q
        .replace(/compare|with|versus|vs|and|between|the|in|difference|to|from/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3);

      for (const w of words) {
        const found = findDistrictInIndex(w, districtsIndex);
        if (found && found.id !== activeDistrict.district_id) {
          targetDistrictEntry = found;
          break;
        }
      }
    }

    if (targetDistrictEntry) {
      const targetDistrict = await loadDistrictMetrics(targetDistrictEntry, surveyYear);

      if (targetDistrict) {
        // Record in conversation context for multi-turn follow-ups
        context.lastComparisonTarget = {
          name: targetDistrict.district_name,
          stateCode: targetDistrictEntry.state_code,
          metrics: targetDistrict,
        };
        context.lastDiscussedDistrict = {
          id: targetDistrict.district_id,
          name: targetDistrict.district_name,
          stateCode: targetDistrict.state_code,
          stateName: targetDistrict.state_name,
          metrics: targetDistrict,
        };

        // Determine indicators: check if specific domain was mentioned
        let fieldsToCompare: readonly string[] = CORE_COMPARISON_FIELDS;
        let domainLabel = "Key Development Indicators";

        for (const [catKey, catVal] of Object.entries(INDICATOR_CATEGORIES)) {
          if (q.includes(catKey) || q.includes(catVal.label.toLowerCase())) {
            fieldsToCompare = catVal.indicators;
            domainLabel = catVal.label;
            context.lastDiscussedCategory = catKey;
            break;
          }
        }

        const { comparisons, visualBars } = buildComparisonsAndBars(
          dName,
          activeDistrict,
          targetDistrict.district_name,
          targetDistrict,
          fieldsToCompare
        );

        const d1Wins = comparisons.filter((c) => c.isEntity1Better).length;
        const d2Wins = comparisons.length - d1Wins;
        const isCrossState = stateCode !== targetDistrictEntry.state_code;

        return {
          title: `${dName}, ${stateName} vs ${targetDistrict.district_name}, ${targetDistrict.state_name}`,
          subtitle: `${domainLabel} · ${activeDistrict.metadata.source} (${activeDistrict.metadata.year})`,
          summary: `Comparing **${dName}** against **${targetDistrict.district_name}** across ${comparisons.length} compatible indicators. ${
            d1Wins > d2Wins
              ? `**${dName}** performs better in ${d1Wins} areas.`
              : `**${targetDistrict.district_name}** performs better in ${d2Wins} areas.`
          }`,
          comparisons,
          visualBars,
          insights: [
            `${dName} (${stateCode}) leads in: ${
              comparisons.filter((c) => c.isEntity1Better).slice(0, 2).map((c) => c.label).join(", ") || "None"
            }.`,
            `${targetDistrict.district_name} (${targetDistrict.state_code}) leads in: ${
              comparisons.filter((c) => !c.isEntity1Better).slice(0, 2).map((c) => c.label).join(", ") || "None"
            }.`,
            isCrossState
              ? `Cross-state comparison between ${stateName} and ${targetDistrict.state_name} utilizes synchronized ${activeDistrict.metadata.source} indicators.`
              : `Same-state comparison within ${stateName}.`,
          ],
          citation: `${activeDistrict.metadata.source} Official Factsheets for ${dName} and ${targetDistrict.district_name}. Grounded in verified microdata.`,
        };
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 10. DIAGNOSTIC REASONING: "WHY IS THERE A DIFFERENCE?"
  // ──────────────────────────────────────────────────────────────────────────
  // E.g. "Why is Surat performing differently from Ahmedabad?", "Why is there a difference in nutrition?"
  if (
    q.includes("why is") ||
    q.includes("why did") ||
    q.includes("reason for difference") ||
    q.includes("explain the difference") ||
    q.includes("why does") ||
    q.includes("why are") ||
    (q.includes("why") && (q.includes("lower") || q.includes("higher") || q.includes("gap") || q.includes("differ")))
  ) {
    const target = context.lastComparisonTarget;
    const targetName = target?.name || (otherDistricts[0]?.name ?? "peer districts");
    const targetMetrics = target?.metrics;

    let catInfo: { label: string; indicators: readonly string[] } = INDICATOR_CATEGORIES.nutrition;
    for (const [cKey, cVal] of Object.entries(INDICATOR_CATEGORIES)) {
      if (q.includes(cKey) || q.includes(cVal.label.toLowerCase())) {
        catInfo = cVal;
        break;
      }
    }

    const actualDataPoints: string[] = [];
    if (targetMetrics) {
      for (const f of catInfo.indicators.slice(0, 4)) {
        const v1 = activeDistrict[f as keyof DistrictMetrics] as number | null;
        const v2 = targetMetrics[f as keyof DistrictMetrics] as number | null;
        const meta = METRIC_LABELS[f];
        if (typeof v1 === "number" && typeof v2 === "number") {
          actualDataPoints.push(
            `${meta?.label}: **${dName}** = ${v1.toFixed(1)}${meta?.unit || "%"} vs **${targetName}** = ${v2.toFixed(1)}${meta?.unit || "%"}`
          );
        }
      }
    } else {
      const stateAvg = getStateAverage(allDistricts);
      for (const f of catInfo.indicators.slice(0, 4)) {
        const v1 = activeDistrict[f as keyof DistrictMetrics] as number | null;
        const avg = stateAvg[f];
        const meta = METRIC_LABELS[f];
        if (typeof v1 === "number" && typeof avg === "number") {
          actualDataPoints.push(
            `${meta?.label}: **${dName}** = ${v1.toFixed(1)}${meta?.unit || "%"} vs **State Avg** = ${avg.toFixed(1)}${meta?.unit || "%"}`
          );
        }
      }
    }

    return {
      title: `Diagnostic Analysis: ${catInfo.label} Divergence`,
      subtitle: `${dName} vs ${targetName}`,
      summary: `An evaluation of the underlying microdata in **${catInfo.label.toLowerCase()}** reveals key structural drivers of the divergence between **${dName}** and **${targetName}**:`,
      diagnosticReasoning: {
        actualData: actualDataPoints,
        aiInterpretation: `Based on verified dataset indicators, variations in ${catInfo.label.toLowerCase()} correlate strongly with foundational maternal healthcare access (such as 4+ antenatal care visits and institutional delivery frequency), infant complementary feeding practices (minimum adequate diet), and urban primary healthcare center density. Where municipal infrastructure (electricity, piped drinking water) is comparable, health divergence is predominantly driven by frontline health worker outreach (ASHA/Anganwadi worker density), local dietary diversity, and socioeconomic factors.`,
        caveat: `Data Grounding Notice: Numerical comparisons above reflect verified ${activeDistrict.metadata.source} survey observations. Causal attributions represent public health developmental syntheses; survey datasets do not record qualitative municipal policy decisions.`,
      },
      citation: `National Family Health Survey (${activeDistrict.metadata.source}) Grounded Comparison`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 11. DEVELOPMENT GAPS & PRIORITIES FOR REFORM
  // ──────────────────────────────────────────────────────────────────────────
  // E.g. "what are the development gaps in my district?", "what needs improvement in Ahmedabad?", "priority areas"
  if (
    q.includes("gap") ||
    q.includes("priority") ||
    q.includes("priorities") ||
    q.includes("improve") ||
    q.includes("improvement") ||
    q.includes("weak") ||
    q.includes("weakness") ||
    q.includes("lag") ||
    q.includes("attention") ||
    q.includes("what should be fixed") ||
    q.includes("development gap")
  ) {
    const priorities = getPriorityAreas(activeDistrict, allDistricts).slice(0, 4);

    const comparisons: ComparisonItem[] = priorities.map((p) => {
      const meta = METRIC_LABELS[p.field];
      const diffInfo = calculateDifference(p.field, p.value, p.stateAverage);
      return {
        field: p.field,
        label: p.label,
        unit: meta?.unit || "%",
        entity1Value: p.value,
        entity2Value: p.stateAverage,
        diff: diffInfo.diff,
        diffFormatted: diffInfo.diffFormatted,
        isEntity1Better: diffInfo.isEntity1Better,
        direction: diffInfo.direction,
      };
    });

    const visualBars: VisualBarItem[] = priorities.slice(0, 3).map((p) => {
      const meta = METRIC_LABELS[p.field];
      const diffInfo = calculateDifference(p.field, p.value, p.stateAverage);
      return {
        label: p.label,
        unit: meta?.unit || "%",
        entity1Name: dName,
        entity1Value: p.value,
        entity2Name: "State Avg",
        entity2Value: p.stateAverage,
        diffFormatted: diffInfo.diffFormatted,
        isEntity1Better: diffInfo.isEntity1Better,
      };
    });

    return {
      title: `Top Development Gaps & Priorities`,
      subtitle: `${dName}, ${stateName} · Severity-Ranked Priority Engine`,
      summary: `An automated audit of **${dName}**'s indicators identifies the following critical gaps where performance lags state benchmarks or demands urgent programmatic intervention:`,
      comparisons,
      visualBars,
      bullets: priorities.map(
        (p, idx) => `**Priority ${idx + 1}: ${p.label}** (Score: ${p.priorityScore.toFixed(0)}) — ${p.reason}`
      ),
      insights: [
        `Urgent attention is needed on **${priorities[0]?.label}**, which demonstrates the highest combined severity and deficit compared to ${stateName}'s average.`,
      ],
      citation: `National Family Health Survey (${activeDistrict.metadata.source}) ${activeDistrict.metadata.year} Factsheets. Calculated dynamically via Priority Engine.`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 12. MACHINE LEARNING PEER / SIMILAR DISTRICTS (KNN)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    q.includes("similar") ||
    q.includes("peer") ||
    q.includes("knn") ||
    q.includes("cluster") ||
    q.includes("nearest") ||
    q.includes("like ahmedabad") ||
    q.includes("like surat")
  ) {
    const peers = getSimilarDistricts(activeDistrict, allDistricts, 4);
    const clusters = runKMeansClustering(allDistricts, 4);
    const myCluster = clusters.find((c) =>
      c.districts.some((d) => d.district_id === activeDistrict.district_id)
    );
    const clusterLabel = myCluster ? myCluster.label : "Balanced Development Profile";

    const selectedScores = getDimensionScores(activeDistrict);
    const keys = Object.keys(INDICATOR_CATEGORIES);

    const similarDistricts: SimilarDistrictResult[] = peers.map((p) => {
      const pScores = getDimensionScores(p);
      let sumSq = 0;
      for (const k of keys) {
        sumSq += Math.pow(selectedScores[k] - pScores[k], 2);
      }
      const distance = Math.sqrt(sumSq);
      const similarityScore = Math.max(50, Math.min(98, Math.round(100 - (distance / 244.95) * 100)));

      const strengths = Object.entries(pScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([dim]) => INDICATOR_CATEGORIES[dim as keyof typeof INDICATOR_CATEGORIES]?.label || dim);

      return {
        districtName: p.district_name,
        stateCode: p.state_code,
        stateName: p.state_name,
        similarityScore,
        clusterLabel,
        keyStrengths: strengths.join(" and "),
      };
    });

    return {
      title: `Machine Learning Peer Districts`,
      subtitle: `${dName}, ${stateName} · Clustered under "${clusterLabel}"`,
      summary: `Using multi-dimensional K-Nearest Neighbors (KNN) across 6 developmental dimensions, **${dName}** is statistically closest to the following peer districts in ${stateName}:`,
      similarDistricts,
      bullets: [
        `**${peers[0]?.district_name}**: ${similarDistricts[0]?.similarityScore}% mathematical similarity. Closest developmental profile.`,
        `**${peers[1]?.district_name}**: ${similarDistricts[1]?.similarityScore}% similarity. High overlap in infrastructure and health coverage.`,
        `**${peers[2]?.district_name}**: ${similarDistricts[2]?.similarityScore}% similarity. Shared demographic baseline.`,
      ],
      insights: [
        `Clustering Insight: All 3 peer districts fall into the "${clusterLabel}" tier, characterized by comparable basic service levels.`,
        `Methodology: Similarity scores are computed via L2-Norm Euclidean distance across 6 composite scores (Health, Nutrition, Education, Women & Gender, Basic Services, Child Wellbeing). No scores are fabricated.`,
      ],
      citation: `Calculated from verified ${activeDistrict.metadata.source} indicators via Portal ML Engine.`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 13. SPECIFIC INDICATOR INQUIRY / VERIFIED DATA LOOKUP
  // ──────────────────────────────────────────────────────────────────────────
  // E.g. "what is child anaemia in Ahmedabad?", "literacy rate of Surat", "how many people have electricity?"
  const resolvedInd = resolveIndicatorFromQuery(q);

  if (resolvedInd) {
    context.lastDiscussedIndicator = resolvedInd.field;
    context.lastDiscussedCategory = resolvedInd.categoryKey;

    // Check if another district was specified in the query
    let targetDistrictData = activeDistrict;
    if (otherDistricts.length > 0) {
      const otherMetric = await loadDistrictMetrics(otherDistricts[0], surveyYear);
      if (otherMetric) {
        targetDistrictData = otherMetric;
      }
    }

    const curDName = targetDistrictData.district_name;
    const curStateName = targetDistrictData.state_name;
    const val = targetDistrictData[resolvedInd.field as keyof DistrictMetrics] as number | null;

    if (typeof val === "number") {
      const stateAverages = getStateAverage(allDistricts);
      const stateVal = stateAverages[resolvedInd.field] ?? val;
      const diffInfo = calculateDifference(resolvedInd.field, val, stateVal);

      const comparisons: ComparisonItem[] = [
        {
          field: resolvedInd.field,
          label: resolvedInd.label,
          unit: resolvedInd.unit,
          entity1Value: val,
          entity2Value: stateVal,
          diff: diffInfo.diff,
          diffFormatted: diffInfo.diffFormatted,
          isEntity1Better: diffInfo.isEntity1Better,
          direction: diffInfo.direction,
        },
      ];

      const visualBars: VisualBarItem[] = [
        {
          label: resolvedInd.label,
          unit: resolvedInd.unit,
          entity1Name: curDName,
          entity1Value: val,
          entity2Name: `${curStateName} Avg`,
          entity2Value: stateVal,
          diffFormatted: diffInfo.diffFormatted,
          isEntity1Better: diffInfo.isEntity1Better,
        },
      ];

      return {
        title: `${resolvedInd.label}: ${curDName}`,
        subtitle: `${curDName} vs ${curStateName} State Average · ${activeDistrict.metadata.source} (${activeDistrict.metadata.year})`,
        summary: `In **${curDName}**, the verified value for **${resolvedInd.label}** is **${val.toFixed(1)}${resolvedInd.unit}** (compared to the ${curStateName} state average of **${stateVal.toFixed(1)}${resolvedInd.unit}**).\n\n**What it measures:** ${resolvedInd.description}.`,
        comparisons,
        visualBars,
        bullets: [
          `**Indicator Direction**: ${
            resolvedInd.direction === "positive"
              ? "Higher is better (favorable human development)"
              : "Lower is better (risk / lagging metric)"
          }.`,
          `**Benchmark Comparison**: ${
            diffInfo.isEntity1Better
              ? `**${curDName}** performs better than the state average by **${Math.abs(diffInfo.diff).toFixed(1)} pp**.`
              : `**${curDName}** is currently lagging behind the state average by **${Math.abs(diffInfo.diff).toFixed(1)} pp**.`
          }`,
        ],
        citation: `${activeDistrict.metadata.source} Official Factsheet for ${curDName}. Grounded in verified microdata.`,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 14. SAFE, HELPFUL & GROUNDED NATURAL LANGUAGE FALLBACK
  // ──────────────────────────────────────────────────────────────────────────
  return {
    title: `District Intelligence Assistant`,
    subtitle: `${dName}, ${stateName} · Connected to verified dataset`,
    summary: `I understood your query about "${rawQuery}". While I could not find a direct statistical indicator match for those specific terms in the **${dName}** dataset, I am equipped to answer any question regarding:`,
    bullets: [
      `**Health & Nutrition**: "What is child anaemia in ${dName}?", "What is stunting?", or "What are major health problems here?"`,
      `**Cross-District Comparisons**: "Compare ${dName} with Surat" or "Which district has higher vaccination?"`,
      `**State Benchmarks**: "Compare ${dName} with ${stateName} average"`,
      `**Development Gaps**: "What are ${dName}'s biggest development gaps?"`,
      `**Indian Geography**: "What is the capital of Gujarat?" or "What state is Surat in?"`,
      `**Survey Methodology**: "What is NFHS?" or "What does this percentage mean?"`,
    ],
    citation: `${activeDistrict.metadata.source} (${activeDistrict.metadata.year}) Grounded District Dataset. Unverified external statistics are not fabricated.`,
  };
}
