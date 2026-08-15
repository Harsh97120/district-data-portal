#!/usr/bin/env python3
"""
excel_to_json.py
----------------
Converts NFHS-5 district-wise Excel sheets to JSON metrics files.

Usage:
    python scripts/excel_to_json.py --input "path/to/districts.xlsx" --state GJ --output data/metrics/GJ.json

Requirements:
    pip install openpyxl pandas

Notes:
    - Reads the first sheet by default. Use --sheet to specify by name or index.
    - District ID is generated as: STATE_CODE-District_Name (spaces replaced with underscores stripped).
    - Column mapping is auto-detected. Add manual overrides in COLUMN_MAP below.
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    sys.exit("ERROR: pandas not installed. Run: pip install pandas openpyxl")

# ─────────────────────────────────────────────────────────────────────────────
# COLUMN MAPPING
# Keys are the JSON field names. Values are possible Excel column header names
# (case-insensitive, partial match). First match wins.
# Add or edit this dict when you know your actual column headers.
# ─────────────────────────────────────────────────────────────────────────────
COLUMN_MAP = {
    "district_name":       ["district", "district name", "district_name"],
    "state_name":          ["state", "state name", "state_name"],
    "literacy_rate":       ["literacy rate", "literacy_rate", "literacy"],
    "sex_ratio":           ["sex ratio", "sex_ratio"],
    "households_surveyed": ["number of households", "households surveyed", "hh surveyed", "households"],
    "women_interviewed":   ["women age 15-49", "women interviewed", "women 15-49"],
    "men_interviewed":     ["men age 15-54", "men interviewed", "men 15-54"],
    "child_population_pct":["child population", "children under 15", "population under 15"],
    "household_size_avg":  ["household size", "avg household", "average household"],
}


def slugify(name: str) -> str:
    """Convert a district name to a slug suitable for district_id."""
    name = name.strip()
    name = re.sub(r"\s+", " ", name)
    return name


def find_column(df_columns: list, candidates: list[str]) -> str | None:
    """Find the first DataFrame column that matches any candidate (case-insensitive, partial)."""
    cols_lower = {c.lower(): c for c in df_columns}
    for candidate in candidates:
        cand_lower = candidate.lower()
        for col_lower, col_orig in cols_lower.items():
            if cand_lower in col_lower or col_lower in cand_lower:
                return col_orig
    return None


def convert(input_path: str, state_code: str, output_path: str, sheet: str | int = 0):
    print(f"Reading: {input_path} (sheet={sheet!r})")
    df = pd.read_excel(input_path, sheet_name=sheet, header=0)
    df.columns = [str(c).strip() for c in df.columns]

    print(f"Detected columns ({len(df.columns)}): {list(df.columns)}")
    print()

    # Resolve column mapping
    resolved = {}
    missing = []
    for field, candidates in COLUMN_MAP.items():
        col = find_column(list(df.columns), candidates)
        if col:
            resolved[field] = col
            print(f"  ✓ {field:30s} → '{col}'")
        else:
            missing.append(field)
            print(f"  ✗ {field:30s} → NOT FOUND (will be null)")

    if "district_name" not in resolved:
        sys.exit("ERROR: Could not find district name column. Update COLUMN_MAP with your column header.")

    print()

    records = []
    for _, row in df.iterrows():
        district_name_raw = row[resolved["district_name"]]
        if pd.isna(district_name_raw) or str(district_name_raw).strip() == "":
            continue  # skip blank rows

        district_name = str(district_name_raw).strip()
        state_name = str(row.get(resolved.get("state_name", ""), state_code)).strip() if "state_name" in resolved else state_code

        def get_val(field, dtype=float):
            col = resolved.get(field)
            if not col:
                return None
            val = row.get(col)
            if pd.isna(val):
                return None
            try:
                return dtype(val)
            except (ValueError, TypeError):
                return None

        record = {
            "district_id": f"{state_code}-{slugify(district_name)}",
            "district_name": district_name,
            "state_code": state_code,
            "state_name": state_name,
            "literacy_rate": get_val("literacy_rate"),
            "sex_ratio": get_val("sex_ratio"),
            "households_surveyed": get_val("households_surveyed", int),
            "women_interviewed": get_val("women_interviewed", int),
            "men_interviewed": get_val("men_interviewed", int),
            "child_population_pct": get_val("child_population_pct"),
            "household_size_avg": get_val("household_size_avg"),
            "metadata": {
                "source": "NFHS-5",
                "year": "2019-21"
            }
        }
        records.append(record)

    print(f"Converted {len(records)} districts.")

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    print(f"Written to: {out}")
    if missing:
        print()
        print("⚠ The following fields were not found and will be null in the output:")
        for m in missing:
            print(f"   - {m}")
        print("  → Update COLUMN_MAP in this script with your actual column headers.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert NFHS-5 Excel to district JSON")
    parser.add_argument("--input",  required=True, help="Path to Excel (.xlsx) file")
    parser.add_argument("--state",  required=True, help="2-letter state code, e.g. GJ")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    parser.add_argument("--sheet",  default=0,     help="Sheet name or 0-based index (default: 0)")
    args = parser.parse_args()

    sheet: str | int = args.sheet
    try:
        sheet = int(sheet)
    except ValueError:
        pass  # use as string (sheet name)

    convert(args.input, args.state.upper(), args.output, sheet)
