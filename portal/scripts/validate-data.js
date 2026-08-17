#!/usr/bin/env node
/**
 * validate-data.js
 * ─────────────────
 * Run from: c:\Classroom\Sem 7\BMP2\portal\
 *   npm run validate-data
 *
 * Checks:
 *  1. Required boundary files are present in public/data/boundaries/
 *  2. Each district in data/metrics/[code].json has literacy_rate (non-null)
 *  3. Reports missing / null fields
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");          // portal/
const DATA_DIR = path.join(ROOT, "public", "data");
const METRICS = path.join(DATA_DIR, "metrics");
const BOUNDS = path.join(DATA_DIR, "boundaries", "districts");

let errors = 0;
let warnings = 0;

function ok(msg) { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.warn(`  ⚠ ${msg}`); warnings++; }
function fail(msg) { console.error(`  ✗ ${msg}`); errors++; }

// ── 1. Check boundary files ──────────────────────────────────────────────
console.log("\n📍 Boundary files\n");

const statesGeo = path.join(DATA_DIR, "boundaries", "india-states.geojson");
if (fs.existsSync(statesGeo)) {
  ok(`india-states.geojson  (${(fs.statSync(statesGeo).size / 1024).toFixed(0)} KB)`);
} else {
  fail(`india-states.geojson NOT FOUND — expected at:\n       ${statesGeo}\n       → Download from https://github.com/datta07/INDIAN-SHAPEFILES`);
}

const metricFiles = fs.existsSync(METRICS)
  ? fs.readdirSync(METRICS).filter(f => f.endsWith(".json"))
  : [];

if (metricFiles.length === 0) {
  warn("No metrics JSON files found in public/data/metrics/");
} else {
  for (const file of metricFiles) {
    const code = path.basename(file, ".json");
    const geoFile = path.join(BOUNDS, `${code}.geojson`);
    if (fs.existsSync(geoFile)) {
      ok(`districts/${code}.geojson  (${(fs.statSync(geoFile).size / 1024).toFixed(0)} KB)`);
    } else {
      warn(`districts/${code}.geojson NOT FOUND for state ${code}\n       → Download from https://github.com/datta07/INDIAN-SHAPEFILES/tree/master/INDIA_STATES/`);
    }
  }
}

// ── 2. Validate each metrics file ────────────────────────────────────────
console.log("\n📊 Metrics data\n");

const REQUIRED_FIELDS = [
  "district_id", "district_name", "state_code", "state_name",
  "literacy_rate", "sex_ratio", "households_surveyed",
  "women_interviewed", "men_interviewed",
  "health_insurance", "institutional_births", "anc_4_visits", "pnc_within_2_days", "full_vaccination", "bp_screening", "diabetes_screening",
  "child_stunting", "child_wasting", "child_underweight", "child_anaemia", "women_anaemia", "exclusive_breastfeeding", "adequate_diet",
  "women_schooling_10_years", "early_marriage", "teenage_pregnancy", "modern_contraceptive", "women_bank_account", "women_decision_making",
  "school_attendance_6_17", "dropout_rate", "learning_proficiency", "retention_rate",
  "electricity_access", "drinking_water_improved", "sanitation_facility_improved", "clean_cooking_fuel", "housing_solid", "internet_access"
];

for (const file of metricFiles) {
  const filePath = path.join(METRICS, file);
  let districts;
  try {
    districts = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    fail(`${file}: JSON parse error — ${e.message}`);
    continue;
  }

  if (!Array.isArray(districts)) {
    fail(`${file}: top-level value is not an array`);
    continue;
  }

  ok(`${file}: ${districts.length} districts`);

  let nullCount = 0;
  for (const d of districts) {
    for (const field of REQUIRED_FIELDS) {
      if (d[field] === null || d[field] === undefined) {
        nullCount++;
        if (nullCount <= 5) warn(`  ${d.district_name ?? "?"}: field "${field}" is null`);
      }
    }
  }
  if (nullCount > 5) warn(`  ... and ${nullCount - 5} more null fields (run script for full list)`);
  if (nullCount === 0) ok(`  All required fields populated`);
}

// ── 3. Summary ────────────────────────────────────────────────────────────
console.log("\n─────────────────────────────────────");
if (errors === 0 && warnings === 0) {
  console.log("✅  All checks passed!\n");
} else {
  if (errors > 0) console.error(`❌  ${errors} error(s) found\n`);
  if (warnings > 0) console.warn(`⚠   ${warnings} warning(s) found\n`);
  if (errors > 0) process.exit(1);
}
