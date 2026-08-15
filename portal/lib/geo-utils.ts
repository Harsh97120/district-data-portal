import type { FeatureCollection, Feature } from "geojson";
import { GEOJSON_PROPS, CHOROPLETH_STEPS, COLORS } from "@/lib/constants";
import type { DistrictGeoProps, StateGeoProps } from "@/lib/types/district";

/**
 * Fetch a GeoJSON file from /data/boundaries/.
 * Returns null if the file is not found.
 */
export async function fetchGeoJSON(
  path: string
): Promise<FeatureCollection | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Extract the district name from a GeoJSON feature's properties.
 * Tries the configured key first, then common fallback keys.
 */
export function getDistrictName(props: DistrictGeoProps): string {
  return (
    (props[GEOJSON_PROPS.districtName] as string) || // "dtname" (datta07 format)
    (props["DISTRICT"] as string) ||                  // fallback for other GeoJSON sources
    (props["NAME_2"] as string) ||                    // GADM format
    (props["district"] as string) ||
    ""
  ).trim();
}

/**
 * Extract the state name from a GeoJSON feature's properties.
 */
export function getStateName(props: StateGeoProps): string {
  return (
    (props[GEOJSON_PROPS.stateName] as string) ||
    (props["NAME_1"] as string) ||
    (props["state"] as string) ||
    ""
  ).trim();
}

/**
 * Get the choropleth fill colour for a given numeric value (e.g. literacy rate).
 * Returns the no-data colour if value is null/undefined.
 */
export function getChoroplethColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return COLORS.noData;
  for (const step of CHOROPLETH_STEPS) {
    if (value <= step.threshold) return step.color;
  }
  return CHOROPLETH_STEPS[CHOROPLETH_STEPS.length - 1].color;
}

/**
 * Get the Leaflet GeoJSON style for a district feature based on its literacy rate.
 */
export function getDistrictStyle(
  value: number | null | undefined,
  isSelected: boolean
): Record<string, unknown> {
  const fillColor = getChoroplethColor(value);
  return {
    fillColor,
    fillOpacity: isSelected ? 0.9 : 0.7,
    color: isSelected ? COLORS.primary : "#FFFFFF",
    weight: isSelected ? 2.5 : 0.8,
    opacity: 1,
  };
}

/**
 * Get the Leaflet GeoJSON style for a state feature (home page map).
 */
export function getStateStyle(
  hasData: boolean,
  isHovered: boolean
): Record<string, unknown> {
  if (isHovered) {
    return {
      fillColor: hasData ? COLORS.primary : "#4B5563",
      fillOpacity: 0.7,
      color: "#FFFFFF",
      weight: 2,
      opacity: 1,
    };
  }
  return {
    fillColor: hasData ? "#F97316" : "#1E293B",
    fillOpacity: hasData ? 0.45 : 0.6,
    color: hasData ? "#FB923C" : "#334155",
    weight: hasData ? 1.5 : 0.8,
    opacity: 1,
  };
}

/**
 * Normalise a string for fuzzy matching between GeoJSON names and data names.
 * e.g. "Chhota Udaipur" → "chhota udaipur"
 */
export function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/**
 * Build a map from normalised GeoJSON feature name → feature index.
 * Used to quickly find a feature by district name.
 */
export function buildGeoNameIndex(
  geojson: FeatureCollection,
  getName: (props: Record<string, unknown>) => string
): Map<string, number> {
  const index = new Map<string, number>();
  geojson.features.forEach((f: Feature, i: number) => {
    const name = getName(f.properties as Record<string, unknown>);
    if (name) index.set(normalise(name), i);
  });
  return index;
}
