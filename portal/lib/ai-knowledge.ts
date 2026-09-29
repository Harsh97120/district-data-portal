/**
 * India District Data & Intelligence Portal — AI Knowledge Base
 * Authoritative Indian geography, states, capitals, census facts,
 * and public health domain concepts (NFHS, nutrition, maternal health, epidemiology).
 */

export interface StateKnowledge {
  name: string;
  code: string;
  capital: string;
  largestCity?: string;
  censusPopulation2011: string;
  estimatedPopulation: string;
  officialLanguages: string[];
  districtCount: number;
  region: "Western" | "Northern" | "Southern" | "Eastern" | "Central" | "North-Eastern";
  description: string;
}

export const STATES_KNOWLEDGE: Record<string, StateKnowledge> = {
  GJ: {
    name: "Gujarat",
    code: "GJ",
    capital: "Gandhinagar",
    largestCity: "Ahmedabad",
    censusPopulation2011: "60.44 million (6,04,39,692)",
    estimatedPopulation: "~71 million",
    officialLanguages: ["Gujarati"],
    districtCount: 33,
    region: "Western",
    description: "Gujarat is located on the western coast of India, bordering Rajasthan, Madhya Pradesh, Maharashtra, and Pakistan. It has India's longest coastline (approx. 1,600 km) and is one of the country's most industrialized and economically vibrant states, known for textiles, petrochemicals, pharmaceuticals, and diamond cutting.",
  },
  MH: {
    name: "Maharashtra",
    code: "MH",
    capital: "Mumbai",
    largestCity: "Mumbai",
    censusPopulation2011: "112.37 million (11,23,74,333)",
    estimatedPopulation: "~126 million",
    officialLanguages: ["Marathi"],
    districtCount: 36,
    region: "Western",
    description: "Maharashtra is India's second most populous state and the largest contributor to the national GDP. Its capital Mumbai is India's financial and commercial capital.",
  },
  RJ: {
    name: "Rajasthan",
    code: "RJ",
    capital: "Jaipur",
    largestCity: "Jaipur",
    censusPopulation2011: "68.55 million",
    estimatedPopulation: "~81 million",
    officialLanguages: ["Hindi", "Rajasthani"],
    districtCount: 50,
    region: "Northern",
    description: "Rajasthan is India's largest state by geographical area, renowned for the Thar Desert, historic forts, palaces, and rich cultural heritage.",
  },
  MP: {
    name: "Madhya Pradesh",
    code: "MP",
    capital: "Bhopal",
    largestCity: "Indore",
    censusPopulation2011: "72.63 million",
    estimatedPopulation: "~86 million",
    officialLanguages: ["Hindi"],
    districtCount: 55,
    region: "Central",
    description: "Madhya Pradesh, situated in central India ('Heart of India'), is known for its extensive forest cover, tribal heritage, national parks, and agriculture.",
  },
  UP: {
    name: "Uttar Pradesh",
    code: "UP",
    capital: "Lucknow",
    largestCity: "Kanpur",
    censusPopulation2011: "199.81 million",
    estimatedPopulation: "~241 million",
    officialLanguages: ["Hindi", "Urdu"],
    districtCount: 75,
    region: "Northern",
    description: "Uttar Pradesh is India's most populous state. It is the heartland of the fertile Gangetic plain with immense cultural, religious, and political significance.",
  },
  KA: {
    name: "Karnataka",
    code: "KA",
    capital: "Bengaluru",
    largestCity: "Bengaluru",
    censusPopulation2011: "61.10 million",
    estimatedPopulation: "~68 million",
    officialLanguages: ["Kannada"],
    districtCount: 31,
    region: "Southern",
    description: "Karnataka in south-western India is a premier technological and industrial powerhouse. Its capital Bengaluru is widely acclaimed as the 'Silicon Valley of India'.",
  },
  TN: {
    name: "Tamil Nadu",
    code: "TN",
    capital: "Chennai",
    largestCity: "Chennai",
    censusPopulation2011: "72.15 million",
    estimatedPopulation: "~77 million",
    officialLanguages: ["Tamil"],
    districtCount: 38,
    region: "Southern",
    description: "Tamil Nadu is a highly industrialized and urbanized southern state known for manufacturing, automobiles, healthcare leadership, Dravidian architecture, and classical Tamil literature.",
  },
  KL: {
    name: "Kerala",
    code: "KL",
    capital: "Thiruvananthapuram",
    largestCity: "Kochi",
    censusPopulation2011: "33.41 million",
    estimatedPopulation: "~35.8 million",
    officialLanguages: ["Malayalam"],
    districtCount: 14,
    region: "Southern",
    description: "Kerala leads India in high Human Development Index (HDI), literacy rates (94%+), high sex ratio, and primary healthcare delivery.",
  },
  AP: {
    name: "Andhra Pradesh",
    code: "AP",
    capital: "Amaravati",
    largestCity: "Visakhapatnam",
    censusPopulation2011: "49.58 million",
    estimatedPopulation: "~53 million",
    officialLanguages: ["Telugu"],
    districtCount: 26,
    region: "Southern",
    description: "Andhra Pradesh, on the south-eastern coast, has India's second-longest coastline, rich agrarian plains of the Godavari and Krishna rivers, and Visakhapatnam port.",
  },
  TS: {
    name: "Telangana",
    code: "TS",
    capital: "Hyderabad",
    largestCity: "Hyderabad",
    censusPopulation2011: "35.19 million",
    estimatedPopulation: "~38 million",
    officialLanguages: ["Telugu", "Urdu"],
    districtCount: 33,
    region: "Southern",
    description: "Formed in 2014, Telangana is centered around the major IT, pharmaceutical, and biotechnology hub of Hyderabad.",
  },
  BR: {
    name: "Bihar",
    code: "BR",
    capital: "Patna",
    largestCity: "Patna",
    censusPopulation2011: "104.10 million",
    estimatedPopulation: "~127 million",
    officialLanguages: ["Hindi", "Urdu"],
    districtCount: 38,
    region: "Eastern",
    description: "Bihar in eastern India has a deep historical legacy (ancient Magadha, Nalanda, Buddhism) and a young demographic profile.",
  },
  WB: {
    name: "West Bengal",
    code: "WB",
    capital: "Kolkata",
    largestCity: "Kolkata",
    censusPopulation2011: "91.28 million",
    estimatedPopulation: "~100 million",
    officialLanguages: ["Bengali", "English"],
    districtCount: 23,
    region: "Eastern",
    description: "West Bengal bridges the Himalayas to the Bay of Bengal and is celebrated for literature, arts, industry, and the Sundarbans mangrove forest.",
  },
  PB: {
    name: "Punjab",
    code: "PB",
    capital: "Chandigarh",
    largestCity: "Ludhiana",
    censusPopulation2011: "27.74 million",
    estimatedPopulation: "~31 million",
    officialLanguages: ["Punjabi"],
    districtCount: 23,
    region: "Northern",
    description: "Punjab, the land of five rivers, is India's agricultural heartland that spearheaded the Green Revolution.",
  },
  HR: {
    name: "Haryana",
    code: "HR",
    capital: "Chandigarh",
    largestCity: "Faridabad",
    censusPopulation2011: "25.35 million",
    estimatedPopulation: "~30 million",
    officialLanguages: ["Hindi"],
    districtCount: 22,
    region: "Northern",
    description: "Surrounding the National Capital Region on three sides, Haryana is a major automotive, industrial, and IT hub (Gurugram).",
  },
  OD: {
    name: "Odisha",
    code: "OD",
    capital: "Bhubaneswar",
    largestCity: "Bhubaneswar",
    censusPopulation2011: "41.97 million",
    estimatedPopulation: "~46 million",
    officialLanguages: ["Odia"],
    districtCount: 30,
    region: "Eastern",
    description: "Odisha on the eastern seaboard possesses vast mineral wealth, temples, maritime heritage, and pioneering disaster management infrastructure.",
  },
  JH: {
    name: "Jharkhand",
    code: "JH",
    capital: "Ranchi",
    largestCity: "Jamshedpur",
    censusPopulation2011: "32.99 million",
    estimatedPopulation: "~39 million",
    officialLanguages: ["Hindi"],
    districtCount: 24,
    region: "Eastern",
    description: "Carved out of Bihar in 2000, Jharkhand holds over 40% of India's mineral reserves including coal, iron ore, and copper.",
  },
  AS: {
    name: "Assam",
    code: "AS",
    capital: "Dispur",
    largestCity: "Guwahati",
    censusPopulation2011: "31.21 million",
    estimatedPopulation: "~36 million",
    officialLanguages: ["Assamese", "Bodo", "Bengali"],
    districtCount: 35,
    region: "North-Eastern",
    description: "Assam is the gateway to North-East India, world-famous for Assam tea, Kaziranga one-horned rhinoceros, oil refineries, and the Brahmaputra River.",
  },
  DL: {
    name: "Delhi (NCT)",
    code: "DL",
    capital: "New Delhi",
    largestCity: "Delhi",
    censusPopulation2011: "16.79 million",
    estimatedPopulation: "~21 million",
    officialLanguages: ["Hindi", "English"],
    districtCount: 11,
    region: "Northern",
    description: "The National Capital Territory of Delhi is the political seat of the Government of India and the country's largest urban agglomeration.",
  },
};

/**
 * Prominent cities and districts knowledge
 */
export const CITY_PROFILES: Record<string, { summary: string; stateName: string; highlights: string }> = {
  ahmedabad: {
    summary: "Ahmedabad (Amdavad) is the largest city in Gujarat and the seventh-largest metropolitan area in India. Located on the banks of the Sabarmati River, it served as Gujarat's capital until 1970. In 2017, historic Ahmedabad became India's first UNESCO World Heritage City.",
    stateName: "Gujarat",
    highlights: "Key commercial, textile, education (IIM-A, NID), and pharmaceutical hub of western India. In this portal, Ahmedabad's health and demographic profile is tracked through verified NFHS-5 and NFHS-6 survey factsheets.",
  },
  surat: {
    summary: "Surat is the second-largest city in Gujarat and the eighth-largest in India, situated at the mouth of the Tapi River. Renowned globally as the 'Diamond City' (processing ~90% of the world's rough diamonds) and 'Textile Hub of India'.",
    stateName: "Gujarat",
    highlights: "One of India's cleanest and most rapidly expanding cities, known for exceptional municipal management, trade logistics, and economic dynamism.",
  },
  vadodara: {
    summary: "Vadodara (historically Baroda) is the cultural capital of Gujarat, situated along the Vishwamitri River. Famed for Laxmi Vilas Palace and Maharaja Sayajirao University (MSU).",
    stateName: "Gujarat",
    highlights: "Major center for chemicals, heavy machinery, petrochemicals, and higher education.",
  },
  rajkot: {
    summary: "Rajkot is the fourth-largest city in Gujarat and the commercial heart of Saurashtra. Known for diesel engines, automobile parts, casting, jewelry, and handicrafts.",
    stateName: "Gujarat",
    highlights: "Key manufacturing hub with high micro-enterprise density.",
  },
  mumbai: {
    summary: "Mumbai (formerly Bombay) is the capital of Maharashtra and the financial capital of India. It houses the Reserve Bank of India (RBI), Bombay Stock Exchange (BSE), National Stock Exchange (NSE), and corporate headquarters of leading Indian and multinational conglomerates.",
    stateName: "Maharashtra",
    highlights: "Deepest natural harbor on India's west coast and home to the Bollywood film industry.",
  },
  pune: {
    summary: "Pune is the second-largest city in Maharashtra and considered the cultural capital of the state. Known as the 'Oxford of the East' for its academic and research institutions.",
    stateName: "Maharashtra",
    highlights: "Major automotive, aerospace, IT software, and manufacturing corridor.",
  },
  bengaluru: {
    summary: "Bengaluru (Bangalore) is the capital of Karnataka and India's technology capital ('Silicon Valley of India'). Headquarters of ISRO, Infosys, Wipro, and hundreds of global R&D centers.",
    stateName: "Karnataka",
    highlights: "Highest concentration of tech startups, venture capital, and aerospace engineering in India.",
  },
  chennai: {
    summary: "Chennai (Madras) is the capital of Tamil Nadu and the largest economic hub in South India. Known as the 'Detroit of India' due to its dominant automobile manufacturing sector.",
    stateName: "Tamil Nadu",
    highlights: "Renowned healthcare and medical tourism destination, major seaport, and cultural center for classical Carnatic music and Bharatanatyam.",
  },
  hyderabad: {
    summary: "Hyderabad is the capital of Telangana and a premier national IT and pharmaceutical biotechnology center ('Genome Valley').",
    stateName: "Telangana",
    highlights: "Home to HITEC City, historic Charminar, Golconda Fort, and world-famous Hyderabadi cuisine.",
  },
  kolkata: {
    summary: "Kolkata (Calcutta) is the capital of West Bengal and the principal commercial and educational center of East India. Former capital of British India until 1911.",
    stateName: "West Bengal",
    highlights: "Intellectual and artistic hub that has produced five Nobel laureates.",
  },
};

/**
 * Domain explanations for public health, survey concepts, and indicators.
 */
export const DOMAIN_EXPLANATIONS: Record<
  string,
  {
    title: string;
    whatItIs: string;
    whyItMatters: string;
    clinicalOrPolicyContext: string;
    targetOrStandard: string;
  }
> = {
  nfhs: {
    title: "National Family Health Survey (NFHS)",
    whatItIs:
      "The National Family Health Survey (NFHS) is a large-scale, multi-round survey conducted in a representative sample of households throughout India. It is led by the Ministry of Health and Family Welfare (MoHFW), Government of India, with the International Institute for Population Sciences (IIPS), Mumbai designated as the nodal agency.",
    whyItMatters:
      "NFHS serves as India's gold-standard microdata repository for monitoring national family welfare schemes, child survival, maternal mortality, nutrition interventions (Poshan Abhiyaan), and tracking UN Sustainable Development Goals (SDGs).",
    clinicalOrPolicyContext:
      "Rounds include NFHS-1 (1992-93), NFHS-2 (1998-99), NFHS-3 (2005-06), NFHS-4 (2015-16), NFHS-5 (2019-21), and the upcoming NFHS-6. NFHS-5 collected data from approximately 6.1 lakh (610,000) households across all 707 districts of India.",
    targetOrStandard:
      "Statistically validated district-level representative sampling using stratified two-stage cluster sampling.",
  },

  anaemia: {
    title: "Anaemia (Definition & Public Health Significance)",
    whatItIs:
      "Anaemia is a condition characterized by a reduced concentration of hemoglobin or healthy red blood cells, which decreases the oxygen-carrying capacity of blood to vital organs. According to WHO criteria, children (6-59 months) and pregnant women with hemoglobin <11.0 g/dL, and non-pregnant women with <12.0 g/dL, are classified as anaemic.",
    whyItMatters:
      "Anaemia causes chronic fatigue, reduced physical stamina, impaired immune defense against infections, and heightened risk of maternal and perinatal mortality during delivery.",
    clinicalOrPolicyContext:
      "In India, the primary driver is nutritional iron-deficiency anaemia, often compounded by folate and Vitamin B12 deficiencies, poor dietary diversity, and hookworm/helminth infections. Government countermeasures include the Anemia Mukt Bharat (AMB) strategy providing Iron & Folic Acid (IFA) supplements and deworming.",
    targetOrStandard:
      "WHO public health threshold: Prevalences ≥40% are classified as a 'Severe Public Health Problem'.",
  },

  child_anaemia: {
    title: "Child Anaemia (Ages 6–59 Months)",
    whatItIs:
      "Measures the percentage of children aged 6 to 59 months whose hemoglobin level is below 11.0 grams per deciliter (g/dL), tested via capillary blood samples in the field.",
    whyItMatters:
      "Childhood (under 5 years) is the critical window of rapid neurodevelopment and brain myelinogenesis. Chronic iron deficiency anaemia impairs cognitive development, memory, attention span, motor skills, and school readiness, effects that are largely irreversible later in life.",
    clinicalOrPolicyContext:
      "Infants transition from breastmilk to complementary foods at 6 months; if complementary diets lack bioavailable iron, anaemia spikes dramatically between 6 and 23 months. Countermeasures include bi-weekly IFA syrup and complementary feeding counselling.",
    targetOrStandard:
      "National target under Anemia Mukt Bharat: reduce child anaemia by 3 percentage points per year. NFHS rates above 50% indicate urgent district intervention.",
  },

  stunting: {
    title: "Child Stunting (Height-for-Age)",
    whatItIs:
      "Stunting is defined by WHO as height-for-age more than 2 standard deviations (-2 SD) below the WHO Child Growth Standards median among children under 5 years of age.",
    whyItMatters:
      "Stunting reflects cumulative, long-term chronic undernutrition, repeated childhood infections (like diarrhoea and pneumonia), and inadequate psychosocial stimulation during the critical 'first 1,000 days' of life (from conception to age 2).",
    clinicalOrPolicyContext:
      "Stunted children face reduced adult physical height, lower cognitive capacity, poorer educational attainment, and decreased adult economic earnings. Interventions focus on maternal nutrition, exclusive breastfeeding for 6 months, and clean drinking water (WASH).",
    targetOrStandard:
      "WHO threshold: <20% is low, 20-29% medium, 30-39% high, and ≥40% is considered very high public health concern.",
  },

  wasting: {
    title: "Child Wasting (Weight-for-Height)",
    whatItIs:
      "Wasting is defined as weight-for-height more than 2 standard deviations (-2 SD) below the WHO Child Growth Standards median. Severe Acute Malnutrition (SAM) is defined as below -3 SD.",
    whyItMatters:
      "Wasting indicates acute, severe weight loss caused by recent inadequate food intake or severe episodes of illness. Severely wasted children face up to a 9-fold higher risk of mortality compared to well-nourished children.",
    clinicalOrPolicyContext:
      "Requires rapid identification via Mid-Upper Arm Circumference (MUAC) tapes and treatment at Nutrition Rehabilitation Centres (NRCs) or Community-based Management of Acute Malnutrition (CMAM).",
    targetOrStandard: "Global Nutrition Target: reduce and maintain child wasting below 5%.",
  },

  vaccination: {
    title: "Full Basic Child Immunization",
    whatItIs:
      "The percentage of children aged 12-23 months who have received all basic vaccinations: BCG (tuberculosis), measles/MR vaccine, and three doses each of oral polio vaccine (OPV) and DPT / Pentavalent vaccine (protecting against diphtheria, pertussis, tetanus, hepatitis B, and Haemophilus influenzae type b).",
    whyItMatters:
      "Immunization is universally recognized as one of the most cost-effective child survival interventions in public health, preventing life-threatening childhood epidemics and permanent disability.",
    clinicalOrPolicyContext:
      "Delivered under the Universal Immunization Programme (UIP) and accelerated through Mission Indradhanush to reach unvaccinated and dropped-out children in remote and urban-slum pockets.",
    targetOrStandard: "National goal under Mission Indradhanush: >90% full immunization coverage.",
  },

  institutional_births: {
    title: "Institutional Deliveries",
    whatItIs:
      "The proportion of deliveries in the five years preceding the survey that took place in a certified medical facility (such as a District Hospital, Sub-District Hospital, Community Health Centre, Primary Health Centre, or accredited private hospital), attended by skilled birth attendants.",
    whyItMatters:
      "Delivery in a health facility drastically curtails Maternal Mortality Ratio (MMR) and Neonatal Mortality Rate (NMR) by providing rapid emergency obstetric care, sterile delivery environments, and active management of third-stage labor (preventing postpartum hemorrhage).",
    clinicalOrPolicyContext:
      "Promoted under Janani Suraksha Yojana (JSY) with conditional direct-benefit cash transfers to pregnant women who deliver in government or accredited health institutions.",
    targetOrStandard: "National target: >95% institutional delivery in every district.",
  },

  sanitation: {
    title: "Improved Sanitation Facilities (Toilet Access)",
    whatItIs:
      "The percentage of household members using an improved sanitation facility that is not shared with other households (flush/pour-flush toilets to piped sewer, septic tank, or pit latrine).",
    whyItMatters:
      "Open defecation and unimproved sanitation contaminate soil and water tables with fecal pathogens, directly causing chronic enteropathy, childhood diarrhoea, worm infestation, and stunting.",
    clinicalOrPolicyContext:
      "Championed under the Swachh Bharat Mission (Grameen & Urban) to eliminate open defecation across India.",
    targetOrStandard: "100% individual household latrine (IHHL) coverage.",
  },

  survey_percentages: {
    title: "How to Interpret Survey Percentages & Gaps",
    whatItIs:
      "In NFHS data sheets, percentages represent the estimated proportion of the eligible population possessing that attribute (e.g. 74.5% of tested children).",
    whyItMatters:
      "Understanding directionality is essential: for 'positive' indicators (like literacy, vaccination, institutional births, electricity), higher percentages indicate better human development. For 'negative/risk' indicators (like stunting, wasting, child anaemia, early marriage, dropout), lower percentages indicate healthier and safer outcomes.",
    clinicalOrPolicyContext:
      "Differences between a district and the state average are expressed in percentage points (pp). A gap of +5 pp in vaccination is an advantage; a gap of +5 pp in stunting is an alarming deficit requiring intervention.",
    targetOrStandard:
      "Benchmark against state averages, national medians, and SDG 2030 targets.",
  },
};
