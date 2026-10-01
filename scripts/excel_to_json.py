#!/usr/bin/env python3
"""
excel_to_json.py
----------------
Converts NFHS state & region-wise Excel statistical indicators to clean JSON files.
Extracts only relevant fields across the 4 key categories (Health, Nutrition,
Women & Gender, Education) plus core demographics.

Usage:
    # Convert all states to state benchmarks JSON:
    python scripts/excel_to_json.py --output portal/public/data/state-benchmarks.json

    # Convert a specific state:
    python scripts/excel_to_json.py --state GJ --output portal/public/data/metrics/GJ_state.json

    # Specify custom input path, year, or region:
    python scripts/excel_to_json.py --input "path/to/nfhs.xlsx" --year NFHS-5 --region Total
"""

import argparse
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# STATE MAPPING (Excel State Name -> 2-Letter State Code & Standard Name)
# ─────────────────────────────────────────────────────────────────────────────
STATE_NAME_TO_CODE = {
    "andhra pradesh": ("AP", "Andhra Pradesh"),
    "arunachal pradesh": ("AR", "Arunachal Pradesh"),
    "assam": ("AS", "Assam"),
    "bihar": ("BR", "Bihar"),
    "chhattisgarh": ("CG", "Chhattisgarh"),
    "goa": ("GA", "Goa"),
    "gujarat": ("GJ", "Gujarat"),
    "haryana": ("HR", "Haryana"),
    "himachal pradesh": ("HP", "Himachal Pradesh"),
    "jharkhand": ("JH", "Jharkhand"),
    "karnataka": ("KA", "Karnataka"),
    "kerala": ("KL", "Kerala"),
    "madhya pradesh": ("MP", "Madhya Pradesh"),
    "maharashtra": ("MH", "Maharashtra"),
    "manipur": ("MN", "Manipur"),
    "meghalaya": ("ML", "Meghalaya"),
    "mizoram": ("MZ", "Mizoram"),
    "nagaland": ("NL", "Nagaland"),
    "odisha": ("OD", "Odisha"),
    "punjab": ("PB", "Punjab"),
    "rajasthan": ("RJ", "Rajasthan"),
    "sikkim": ("SK", "Sikkim"),
    "tamil nadu": ("TN", "Tamil Nadu"),
    "telangana": ("TS", "Telangana"),
    "tripura": ("TR", "Tripura"),
    "uttar pradesh": ("UP", "Uttar Pradesh"),
    "uttarakhand": ("UK", "Uttarakhand"),
    "west bengal": ("WB", "West Bengal"),
    "andaman and nicobar islands": ("AN", "Andaman & Nicobar"),
    "chandigarh": ("CH", "Chandigarh"),
    "dadra and nagar haveli": ("DN", "Dadra & Nagar Haveli"),
    "daman and diu": ("DD", "Daman & Diu"),
    "dadra and nagar haveli and daman and diu": ("DN", "Dadra & Nagar Haveli and Daman & Diu"),
    "delhi": ("DL", "Delhi"),
    "jammu and kashmir": ("JK", "Jammu & Kashmir"),
    "ladakh": ("LA", "Ladakh"),
    "lakshadweep": ("LD", "Lakshadweep"),
    "puducherry": ("PY", "Puducherry"),
    "all india": ("IN", "All India"),
}

# ─────────────────────────────────────────────────────────────────────────────
# RELEVANT FIELD DEFINITIONS & EXCEL INDICATOR MAPPINGS
# Only relevant fields appear in the output JSON.
# ─────────────────────────────────────────────────────────────────────────────
INDICATOR_MAPPING = {
    # ── Category 1: Health & Healthcare Access ──
    "health_insurance": [
        "Households with any usual member covered by a health scheme or health insurance",
        "Households with any usual member covered under a health insurance/financing scheme",
    ],
    "institutional_births": [
        "Institutional births",
        "Institutional births in public facility",
    ],
    "anc_4_visits": [
        "Mothers who had at least 4 antenatal care visits",
    ],
    "pnc_within_2_days": [
        "Mothers who received postnatal care from a doctor/nurse/LHV/ANM/midwife/other health personnel within 2 days of delivery",
        "Children who received postnatal care from a doctor/nurse/LHV/ANM/midwife/other health personnel within 2 days of delivery",
    ],
    "full_vaccination": [
        "Children age 12-23 months fully vaccinated based on information from either vaccination card or mother's recall (%)",
        "Children of age group 12 to 23 months who are fully vaccinated (BCG measles and 3 doses each of polio and DPT), based on information from either vaccination card or mother's recall",
    ],
    "bp_screening": [
        "Elevated blood pressure (Systolic >=140 mm of Hg and/or Diastolic >=90 mm of Hg) or taking medicine to control blood pressure",
        "Mildly elevated blood pressure (Systolic 140-159 mm of Hg and/or Diastolic 90-99 mm of Hg)",
    ],
    "diabetes_screening": [
        "Blood sugar level - high or very high (>140 mg/dl) or taking medicine to control blood sugar level",
        "Blood sugar level - high (>140 mg/dl)",
    ],

    # ── Category 2: Nutrition ──
    "child_stunting": [
        "Children under 5 years who are stunted (height-for-age)",
    ],
    "child_wasting": [
        "Children under 5 years who are wasted (weight-for-height)",
    ],
    "child_underweight": [
        "Children under 5 years who are underweight (weight-for-age)",
    ],
    "child_anaemia": [
        "Children of age group 6 to 59 months who are anaemic (< 11.0 g/dl)",
    ],
    "women_anaemia": [
        "All Women of age group 15 to 49 years who are Anaemic",
    ],
    "exclusive_breastfeeding": [
        "Children under age 6 months exclusively breastfed",
    ],
    "adequate_diet": [
        "Total children age 6-23 months receiving an adequate diet (%)",
        "Total children of age group 6 to 23 months receiving an adequate diet",
    ],

    # ── Category 3: Women & Gender ──
    "women_schooling_10_years": [
        "Women with 10 or more years of schooling",
    ],
    "early_marriage": [
        "Women age 20-24 years married before age 18 years (%)",
    ],
    "teenage_pregnancy": [
        "Women age 15-19 years who were already mothers or pregnant at the time of the survey (%)",
    ],
    "modern_contraceptive": [
        "Any modern method",
    ],
    "women_bank_account": [
        "Women having a bank or savings account that they themselves use",
    ],
    "women_decision_making": [
        "Currently married women who usually participate in three household decisions",
        "Currently married women who usually participate in household decisions",
    ],

    # ── Category 4: Education ──
    "literacy_rate": [
        "Women who are literate",
    ],
    "school_attendance_6_17": [
        "Female population age 6 years and above who ever attended school",
    ],

    # ── Core Demographics & Living Conditions ──
    "sex_ratio": [
        "Sex ratio of the total population (females per 1000 males)",
    ],
    "electricity_access": [
        "Households with Electricity",
        "Population living in households with electricity (%)",
    ],
    "drinking_water_improved": [
        "Households with improved Drinking Water Source",
        "Population living in households with an improved drinking-water source (%)",
    ],
    "sanitation_facility_improved": [
        "Households with improved Sanitation facility",
    ],
    "clean_cooking_fuel": [
        "Households using clean fuel for cooking",
    ],
    "internet_access": [
        "Women who have ever used the internet",
    ],
}


def parse_xlsx(xlsx_path: str):
    """
    Reads .xlsx directly using Python standard library (zipfile + xml.etree.ElementTree).
    Zero third-party library dependencies (no openpyxl or pandas required).
    """
    with zipfile.ZipFile(xlsx_path, "r") as z:
        ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

        # Read shared strings table
        strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            sst_tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in sst_tree.findall("ns:si", ns):
                text = "".join(t.text for t in si.findall(".//ns:t", ns) if t.text)
                strings.append(text)

        # Read primary worksheet (sheet1.xml)
        sheet_tree = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = sheet_tree.findall(".//ns:row", ns)

        def col_letter(ref):
            m = re.match(r"([A-Z]+)", ref)
            return m.group(1) if m else ""

        records = []
        for r in rows[1:]:  # skip header row
            row_dict = {}
            for c in r.findall("ns:c", ns):
                ref = c.attrib.get("r", "")
                col = col_letter(ref)
                cell_type = c.attrib.get("t", "")
                v = c.find("ns:v", ns)
                val = v.text if v is not None else None
                if cell_type == "s" and val is not None:
                    val = strings[int(val)]
                row_dict[col] = val

            # Columns in Excel:
            # A: state, B: region, C: category, D: indicator, E: nfhs_4, F: nfhs_5, G: nfhs_6, H: units, I: notes
            records.append({
                "state": row_dict.get("A", "").strip() if row_dict.get("A") else "",
                "region": row_dict.get("B", "").strip() if row_dict.get("B") else "",
                "category": row_dict.get("C", "").strip() if row_dict.get("C") else "",
                "indicator": row_dict.get("D", "").strip() if row_dict.get("D") else "",
                "nfhs_4": row_dict.get("E"),
                "nfhs_5": row_dict.get("F"),
                "nfhs_6": row_dict.get("G"),
                "units": row_dict.get("H", "").strip() if row_dict.get("H") else "",
            })

    return records


def clean_num(val):
    """Parses numeric string safely; returns float, int, or None."""
    if val is None or val == "" or str(val).strip() in ("*", "-", "na", "NA", "N/A"):
        return None
    try:
        f = float(str(val).strip().replace(",", ""))
        return int(f) if f.is_integer() else round(f, 2)
    except (ValueError, TypeError):
        return None


def extract_state_metrics(records, target_year="NFHS-5", target_region="Total", filter_state_code=None):
    """
    Extracts relevant fields for each state matching the target region and survey year.
    Returns a dict of state_code -> state metrics object.
    """
    year_col = {
        "NFHS-4": "nfhs_4",
        "NFHS-5": "nfhs_5",
        "NFHS-6": "nfhs_6",
    }.get(target_year, "nfhs_5")

    # Group records by lowercase state name
    by_state = {}
    for r in records:
        if r["region"].lower() != target_region.lower():
            continue
        st_lower = r["state"].lower().strip()
        by_state.setdefault(st_lower, []).append(r)

    results = {}

    for st_name, st_records in by_state.items():
        if st_name not in STATE_NAME_TO_CODE:
            continue
        sc, std_name = STATE_NAME_TO_CODE[st_name]

        if filter_state_code and sc != filter_state_code.upper():
            continue

        state_entry = {
            "state_code": sc,
            "state_name": std_name,
            "region": target_region,
            "survey_year": target_year,
        }

        # Populate ONLY the relevant fields
        for field, candidate_indicators in INDICATOR_MAPPING.items():
            val = None
            for cand in candidate_indicators:
                for r in st_records:
                    if r["indicator"] == cand:
                        raw_val = r.get(year_col)
                        parsed = clean_num(raw_val)
                        if parsed is not None:
                            val = parsed
                            break
                if val is not None:
                    break
            state_entry[field] = val

        results[sc] = state_entry

def extract_all_state_benchmarks(records, target_region="Total", filter_state_code=None):
    """
    Extracts multi-year (NFHS-5 and NFHS-6) relevant fields for each state.
    Returns a dict mapping state_code -> { state_code, state_name, NFHS-5: {...}, NFHS-6: {...} }
    """
    by_state = {}
    for r in records:
        if r["region"].lower() != target_region.lower():
            continue
        st_lower = r["state"].lower().strip()
        by_state.setdefault(st_lower, []).append(r)

    results = {}
    for st_name, st_records in by_state.items():
        if st_name not in STATE_NAME_TO_CODE:
            continue
        sc, std_name = STATE_NAME_TO_CODE[st_name]

        if filter_state_code and sc != filter_state_code.upper():
            continue

        state_entry = {
            "state_code": sc,
            "state_name": std_name,
            "region": target_region,
            "NFHS-5": {},
            "NFHS-6": {},
        }

        for field, candidate_indicators in INDICATOR_MAPPING.items():
            # NFHS-5
            v5 = None
            for cand in candidate_indicators:
                for r in st_records:
                    if r["indicator"] == cand:
                        parsed = clean_num(r.get("nfhs_5"))
                        if parsed is not None:
                            v5 = parsed
                            break
                if v5 is not None:
                    break
            state_entry["NFHS-5"][field] = v5

            # NFHS-6
            v6 = None
            for cand in candidate_indicators:
                for r in st_records:
                    if r["indicator"] == cand:
                        parsed = clean_num(r.get("nfhs_6"))
                        if parsed is not None:
                            v6 = parsed
                            break
                if v6 is not None:
                    break
            state_entry["NFHS-6"][field] = v6

        results[sc] = state_entry

    return results


def main():
    default_excel = Path("c:/Classroom/BMP - Project/nfhs-4-5-and-6-state-and-region-wise-statistical-indicators-data-on-family-profile-and-health-status-in-india.xlsx")

    parser = argparse.ArgumentParser(description="Convert NFHS Excel to clean state JSON with only relevant fields")
    parser.add_argument("--input", default=str(default_excel), help="Path to NFHS Excel (.xlsx) file")
    parser.add_argument("--state", default=None, help="Filter for single state code, e.g. GJ, MH, UP")
    parser.add_argument("--year", default=None, choices=["NFHS-4", "NFHS-5", "NFHS-6"], help="Survey year (default: all years)")
    parser.add_argument("--region", default="Total", choices=["Total", "Rural", "Urban"], help="Region scope")
    parser.add_argument("--output", default=None, help="Output JSON path (optional)")
    args = parser.parse_args()

    input_file = Path(args.input)
    if not input_file.exists():
        sys.exit(f"Error: Input Excel file not found at: {input_file}")

    print(f"Reading: {input_file.name}...")
    records = parse_xlsx(str(input_file))
    print(f"Parsed {len(records)} total rows.")

    if args.year:
        data = extract_state_metrics(
            records,
            target_year=args.year,
            target_region=args.region,
            filter_state_code=args.state
        )
        print(f"Extracted relevant indicators for {len(data)} state(s) ({args.year}, {args.region}).")
        output_data = data[args.state.upper()] if args.state and args.state.upper() in data else [data[k] for k in sorted(data.keys())]
    else:
        # Multi-year extraction
        data = extract_all_state_benchmarks(
            records,
            target_region=args.region,
            filter_state_code=args.state
        )
        print(f"Extracted multi-year indicators for {len(data)} state(s) (NFHS-5 & NFHS-6, {args.region}).")
        output_data = data

    output_path = args.output
    if not output_path:
        if args.state and args.year:
            output_path = f"portal/public/data/metrics/{args.state.upper()}_state.json"
        else:
            output_path = "portal/public/data/state-benchmarks.json"

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully saved clean dataset with relevant fields to: {out}")

    # Display sample preview of first state
    sample = output_data[0] if isinstance(output_data, list) and output_data else output_data
    if sample:
        print("\n--- SAMPLE PREVIEW (Only Relevant Fields) ---")
        for k, v in list(sample.items())[:15]:
            print(f"  {k:26s}: {v}")
        print(f"  ... ({len(sample)} total relevant fields)")


if __name__ == "__main__":
    main()
