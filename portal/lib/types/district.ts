// District metric data shape (matches data/metrics/*.json schema)
export interface DistrictMetrics {
  district_id: string;
  district_name: string;
  state_code: string;
  state_name: string;
  literacy_rate: number | null;
  sex_ratio: number | null;
  households_surveyed: number | null;
  women_interviewed: number | null;
  men_interviewed: number | null;
  child_population_pct: number | null;
  household_size_avg: number | null;
  
  // Health
  health_insurance: number | null;
  institutional_births: number | null;
  anc_4_visits: number | null;
  pnc_within_2_days: number | null;
  full_vaccination: number | null;
  bp_screening: number | null;
  diabetes_screening: number | null;

  // Nutrition
  child_stunting: number | null;
  child_wasting: number | null;
  child_underweight: number | null;
  child_anaemia: number | null;
  women_anaemia: number | null;
  exclusive_breastfeeding: number | null;
  adequate_diet: number | null;

  // Women & Gender
  women_schooling_10_years: number | null;
  early_marriage: number | null;
  teenage_pregnancy: number | null;
  modern_contraceptive: number | null;
  women_bank_account: number | null;
  women_decision_making: number | null;

  // Education
  school_attendance_6_17: number | null;
  dropout_rate: number | null;
  learning_proficiency: number | null;
  retention_rate: number | null;

  // Basic Services
  electricity_access: number | null;
  drinking_water_improved: number | null;
  sanitation_facility_improved: number | null;
  clean_cooking_fuel: number | null;
  housing_solid: number | null;
  internet_access: number | null;

  metadata: {
    source: string;
    year: string;
  };
}

// GeoJSON feature properties expected from district boundary files
export interface DistrictGeoProps {
  DISTRICT: string;       // district name as in GeoJSON
  STNAME?: string;        // state name as in GeoJSON
  [key: string]: unknown; // allow additional properties
}

// GeoJSON feature properties expected from India states boundary file
export interface StateGeoProps {
  STNAME: string;         // state name as in GeoJSON
  ST_CODE?: string;       // state code (may not be present in all sources)
  [key: string]: unknown;
}

// Lightweight district summary for listing / map tooltips
export interface DistrictSummary {
  district_id: string;
  district_name: string;
  state_code: string;
  literacy_rate: number | null;
}

// State metadata (used for the home page map)
export interface StateInfo {
  code: string;         // 2-letter code, e.g. "GJ"
  name: string;         // full name, e.g. "Gujarat"
  geoName: string;      // name as it appears in states GeoJSON
  hasData: boolean;     // whether metrics JSON exists for this state
}
