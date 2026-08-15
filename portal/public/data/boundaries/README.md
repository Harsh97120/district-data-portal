# Boundary Files — Setup Instructions

This folder holds the GeoJSON boundary files used by the map. The portal code
expects the following structure **exactly**:

```
data/
└── boundaries/
    ├── README.md              ← this file
    ├── india-states.geojson   ← all Indian states outline
    └── districts/
        ├── GJ.geojson         ← Gujarat district boundaries
        └── [STATE_CODE].geojson  ← other states added later
```

---

## Step 1 — Download India States Boundary

**Source:** [datta07/INDIAN-SHAPEFILES on GitHub](https://github.com/datta07/INDIAN-SHAPEFILES)

Direct download URL:
```
https://github.com/datta07/INDIAN-SHAPEFILES/raw/master/INDIA/INDIA_STATES.geojson
```

**Action:** Save the downloaded file as:
```
data/boundaries/india-states.geojson
```

---

## Step 2 — Download Gujarat District Boundary

Direct download URL:
```
https://github.com/datta07/INDIAN-SHAPEFILES/raw/master/INDIA_STATES/GUJARAT.geojson
```

**Action:** Save the downloaded file as:
```
data/boundaries/districts/GJ.geojson
```

---

## Step 3 — Adding More States Later

For any other state, download the corresponding file from:
```
https://github.com/datta07/INDIAN-SHAPEFILES/tree/master/INDIA_STATES/
```

Name the file using the 2-letter state code (matching `data/metrics/` filenames):

| State | Code | File name |
|-------|------|-----------|
| Gujarat | GJ | `GJ.geojson` |
| Maharashtra | MH | `MH.geojson` |
| Karnataka | KA | `KA.geojson` |
| Delhi | DL | `DL.geojson` |
| Rajasthan | RJ | `RJ.geojson` |
| *(add more as needed)* | | |

---

## GeoJSON Property Names Expected by the Portal

The portal's map code reads these specific property keys from the GeoJSON files:

### India States file (`india-states.geojson`)
| Property | Description | Example |
|----------|-------------|---------|
| `STNAME` | State name | `"Gujarat"` |
| `ST_CODE` | State code (may vary) | `"GJ"` |

### District files (`districts/GJ.geojson`)
| Property | Description | Example |
|----------|-------------|---------|
| `DISTRICT` | District name | `"Valsad"` |
| `STNAME` | State name | `"Gujarat"` |

> **Note:** If the downloaded files use different property keys (e.g. `dtname`, `NAME_2`,
> `district`), open an issue or update `lib/geo-utils.ts` — the `GEOJSON_PROPS` constant
> at the top of that file lets you remap property names without changing any other code.

---

## Verifying Your Files

After placing the files, run:
```bash
npm run validate-data
```

This will check that:
1. All boundary files are present
2. Each district in `data/metrics/GJ.json` matches a district polygon in `GJ.geojson`
3. No districts are orphaned (data but no boundary, or boundary but no data)

---

## License

- **datta07/INDIAN-SHAPEFILES**: Open source, MIT-compatible
- **GADM** (alternative): Free for non-commercial academic use
- **Survey of India**: Restricted — do not use without permission

Attribution (include in your portal footer):  
> District boundary data © [datta07/INDIAN-SHAPEFILES](https://github.com/datta07/INDIAN-SHAPEFILES). Metric data: NFHS-5 (2019–21), MoHFW, Government of India.
