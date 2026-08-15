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
