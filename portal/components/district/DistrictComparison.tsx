"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { DistrictMetrics } from "@/lib/types/district";
import { METRIC_LABELS, INDICATOR_CATEGORIES, STATE_BY_CODE } from "@/lib/constants";
import { getMetricsForYear } from "@/lib/ml-utils";
import { scoreMatch, damerauLevenshtein, jaroWinkler, normalizeStr } from "@/lib/fuzzy-search";
import { fetchDistrictById } from "@/lib/data-loader";
import { logActivity } from "@/lib/activity-logger";

// ── Types ──────────────────────────────────────────────────────────────────

interface DistrictIndexItem {
  id: string;
  name: string;
  state_code: string;
  state_name: string;
}

interface DistrictComparisonProps {
  currentDistrict: DistrictMetrics;
  allDistricts: DistrictMetrics[];
  currentStateName: string;
  currentStateCode: string;
  surveyYear: "NFHS-5" | "NFHS-6";
  initialComparisonId?: string;
  initialIndicator?: string;
}

interface SearchSuggestion {
  item: DistrictIndexItem;
  score: number;
  matchType: string;
}

// ── Helper: Format indicator categories for dropdown ─────────────────────────

const CATEGORY_KEYS = [
  "nutrition",
  "health",
  "women",
  "child_wellbeing",
  "education",
  "basic_services",
] as const;

export default function DistrictComparison({
  currentDistrict,
  allDistricts,
  currentStateName,
  currentStateCode,
  surveyYear: defaultSurveyYear,
  initialComparisonId,
  initialIndicator,
}: DistrictComparisonProps) {
  // ── Nationwide district index state ────────────────────────────────────────
  const [districtIndex, setDistrictIndex] = useState<DistrictIndexItem[]>([]);
  const [loadingIndex, setLoadingIndex] = useState(false);

  // ── Comparison selection state ─────────────────────────────────────────────
  const [comparisonDistrictMeta, setComparisonDistrictMeta] = useState<DistrictIndexItem | null>(null);
  const [comparisonDistrictData, setComparisonDistrictData] = useState<DistrictMetrics | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // ── Indicator & Dataset state ──────────────────────────────────────────────
  const [selectedIndicator, setSelectedIndicator] = useState<string>(initialIndicator || "child_anaemia");
  const [activePeriod, setActivePeriod] = useState<"NFHS-5" | "NFHS-6">(defaultSurveyYear);
  const [isIndicatorMenuOpen, setIsIndicatorMenuOpen] = useState(false);
  const indicatorMenuRef = useRef<HTMLDivElement | null>(null);

  // Restore initial comparison district if passed via deep-link
  useEffect(() => {
    if (initialComparisonId && districtIndex.length > 0 && !comparisonDistrictMeta) {
      const match = districtIndex.find((d) => d.id === initialComparisonId);
      if (match) {
        setComparisonDistrictMeta(match);
      }
    }
  }, [initialComparisonId, districtIndex, comparisonDistrictMeta]);

  // Restore initial indicator if passed via deep-link
  useEffect(() => {
    if (initialIndicator && METRIC_LABELS[initialIndicator]) {
      setSelectedIndicator(initialIndicator);
    }
  }, [initialIndicator]);

  // ── Hover dimming & inspection state ───────────────────────────────────────
  const [hoveredDistrict, setHoveredDistrict] = useState<"current" | "comparison" | null>(null);

  // ── Search & Dropdown state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [didYouMean, setDidYouMean] = useState<DistrictIndexItem | null>(null);
  const [sameDistrictWarning, setSameDistrictWarning] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // ── Load Nationwide District Index on Mount ────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    setLoadingIndex(true);
    fetch("/data/districts-index.json")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DistrictIndexItem[]) => {
        if (isMounted && Array.isArray(data)) {
          setDistrictIndex(data);
          setLoadingIndex(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingIndex(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Click outside listeners ────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (indicatorMenuRef.current && !indicatorMenuRef.current.contains(e.target as Node)) {
        setIsIndicatorMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Fetch Comparison District Data when Selection Changes ──────────────────
  useEffect(() => {
    if (!comparisonDistrictMeta) {
      setComparisonDistrictData(null);
      setComparisonError(null);
      return;
    }

    let isMounted = true;
    setLoadingComparison(true);
    setComparisonError(null);

    // If district is within current state, find from already-loaded allDistricts
    if (comparisonDistrictMeta.state_code === currentStateCode) {
      const found = allDistricts.find((d) => d.district_id === comparisonDistrictMeta.id);
      if (found) {
        setComparisonDistrictData(found);
        setLoadingComparison(false);
        return;
      }
    }

    // Otherwise fetch district metrics by ID
    fetchDistrictById(comparisonDistrictMeta.id)
      .then((data) => {
        if (isMounted) {
          if (data) {
            setComparisonDistrictData(data);
          } else {
            setComparisonError("Failed to load metrics for this district.");
          }
          setLoadingComparison(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setComparisonError("Network error loading district data.");
          setLoadingComparison(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [comparisonDistrictMeta, currentStateCode, allDistricts]);

  // ── Log DISTRICT_COMPARISON Activity ───────────────────────────────────────
  useEffect(() => {
    if (comparisonDistrictMeta && comparisonDistrictData) {
      logActivity({
        actionType: "DISTRICT_COMPARISON",
        districtId: currentDistrict.district_id,
        districtName: currentDistrict.district_name,
        stateName: currentStateName,
        stateCode: currentStateCode,
        comparisonDistrictId: comparisonDistrictMeta.id,
        comparisonDistrictName: comparisonDistrictMeta.name,
        comparisonStateName: comparisonDistrictMeta.state_name,
        comparisonStateCode: comparisonDistrictMeta.state_code,
        indicatorId: selectedIndicator,
        indicatorLabel: METRIC_LABELS[selectedIndicator]?.label,
        dataset: activePeriod,
      });
    }
  }, [
    comparisonDistrictMeta,
    comparisonDistrictData,
    currentDistrict.district_id,
    currentDistrict.district_name,
    currentStateName,
    currentStateCode,
    selectedIndicator,
    activePeriod,
  ]);

  // ── Fast Nationwide Search & Ranking ───────────────────────────────────────
  const searchResults = useMemo<SearchSuggestion[]>(() => {
    const q = searchQuery.trim();
    if (!q || districtIndex.length === 0) {
      return [];
    }

    const scored: SearchSuggestion[] = [];
    const qNorm = normalizeStr(q);
    let bestFuzzyItem: DistrictIndexItem | null = null;
    let bestFuzzyScore = 0;

    for (const item of districtIndex) {
      // Exclude current district from active suggestions list
      const isCurrent = item.id === currentDistrict.district_id;

      // Score matching against district name and state name
      const nameMatch = scoreMatch(q, item.name);
      const stateMatch = scoreMatch(q, item.state_name);
      const combinedScore = Math.max(nameMatch.score, stateMatch.score * 0.7);

      if (combinedScore > 0) {
        scored.push({
          item,
          score: combinedScore,
          matchType: nameMatch.matchType,
        });
      }

      // Check for possible typo suggestion
      if (!isCurrent && qNorm.length >= 3) {
        const jw = jaroWinkler(qNorm, normalizeStr(item.name));
        const dist = damerauLevenshtein(qNorm, normalizeStr(item.name));
        if (jw > bestFuzzyScore && (dist <= 2 || jw >= 0.78)) {
          bestFuzzyScore = jw;
          bestFuzzyItem = item;
        }
      }
    }

    // Sort descending by match score
    scored.sort((a, b) => b.score - a.score);

    // If top score is weak or no direct matches, surface typo candidate
    if (scored.length === 0 && bestFuzzyItem && bestFuzzyScore >= 0.75) {
      setDidYouMean(bestFuzzyItem);
    } else {
      setDidYouMean(null);
    }

    return scored.slice(0, 8);
  }, [searchQuery, districtIndex, currentDistrict.district_id]);

  // Reset highlight on query change
  useEffect(() => {
    setHighlightedIndex(0);
    setSameDistrictWarning(false);
  }, [searchQuery]);

  // ── Handle District Selection ──────────────────────────────────────────────
  const handleSelectDistrict = (item: DistrictIndexItem) => {
    if (item.id === currentDistrict.district_id) {
      setSameDistrictWarning(true);
      return;
    }
    setSameDistrictWarning(false);
    setComparisonDistrictMeta(item);
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  // ── Keyboard Navigation for Search Dropdown ────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen && e.key === "ArrowDown") {
      setIsSearchOpen(true);
      return;
    }

    if (!isSearchOpen || searchResults.length === 0) {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = searchResults[highlightedIndex];
      if (selected) {
        handleSelectDistrict(selected.item);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
    }
  };

  // ── Active Data by Selected Survey Period ──────────────────────────────────
  // Both districts strictly use the SAME dataset period
  const activeCurrentDistrict = useMemo(
    () => getMetricsForYear(currentDistrict, activePeriod),
    [currentDistrict, activePeriod]
  );

  const activeComparisonDistrict = useMemo(
    () => (comparisonDistrictData ? getMetricsForYear(comparisonDistrictData, activePeriod) : null),
    [comparisonDistrictData, activePeriod]
  );

  // ── Metric Metadata & Values ───────────────────────────────────────────────
  const selectedMeta = METRIC_LABELS[selectedIndicator];
  const unit = selectedMeta?.unit ?? "%";
  const isPercent = unit === "%";
  const isNegative = selectedMeta?.direction === "negative";

  const currentVal = activeCurrentDistrict[selectedIndicator as keyof DistrictMetrics] as number | null;
  const comparisonVal = activeComparisonDistrict
    ? (activeComparisonDistrict[selectedIndicator as keyof DistrictMetrics] as number | null)
    : null;

  const hasCurrentVal = typeof currentVal === "number" && !isNaN(currentVal);
  const hasComparisonVal = typeof comparisonVal === "number" && !isNaN(comparisonVal);

  // Percentage width calculations for bars
  const maxScaleVal = isPercent
    ? 100
    : Math.max(100, Math.ceil(Math.max(currentVal ?? 0, comparisonVal ?? 0) * 1.15));

  const currentPct = hasCurrentVal && currentVal !== null
    ? Math.min(100, Math.max(0, (currentVal / maxScaleVal) * 100))
    : 0;

  const comparisonPct = hasComparisonVal && comparisonVal !== null
    ? Math.min(100, Math.max(0, (comparisonVal / maxScaleVal) * 100))
    : 0;

  // Gap / Difference calculation
  const districtGap = useMemo(() => {
    if (!hasCurrentVal || !hasComparisonVal || currentVal === null || comparisonVal === null) {
      return null;
    }
    return parseFloat(Math.abs(currentVal - comparisonVal).toFixed(1));
  }, [currentVal, comparisonVal, hasCurrentVal, hasComparisonVal]);

  const isCrossState = comparisonDistrictMeta ? comparisonDistrictMeta.state_code !== currentStateCode : false;

  // Quick preset districts for empty state exploration
  const quickPresets = useMemo(() => {
    if (districtIndex.length === 0) return [];
    const presets = ["Surat", "Jaipur", "Pune", "Bengaluru", "Indore", "Varanasi"];
    return districtIndex
      .filter((d) => presets.includes(d.name) && d.id !== currentDistrict.district_id)
      .slice(0, 4);
  }, [districtIndex, currentDistrict.district_id]);

  return (
    <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
      {/* ── Section Title & Subtitle + Dataset Selector ────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2D3148] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Compare Districts
            </h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold uppercase tracking-wider">
              Cross-State Analysis
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Compare the same indicator across any two districts nationwide.
          </p>
        </div>

        {/* Dataset Period Selector (Same Period Rule Guaranteed) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-[11px] text-gray-400 font-semibold hidden sm:inline-block">
            Dataset Period:
          </span>
          <div className="flex items-center gap-1 bg-[#0F1117] border border-[#2D3148] p-1 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => setActivePeriod("NFHS-6")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                activePeriod === "NFHS-6"
                  ? "bg-[#1A1D27] text-orange-400 border border-[#2D3148] shadow-sm"
                  : "text-gray-400 hover:text-white border border-transparent"
              }`}
            >
              NFHS-6 (2023–24)
            </button>
            <button
              type="button"
              onClick={() => setActivePeriod("NFHS-5")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                activePeriod === "NFHS-5"
                  ? "bg-[#1A1D27] text-orange-400 border border-[#2D3148] shadow-sm"
                  : "text-gray-400 hover:text-white border border-transparent"
              }`}
            >
              NFHS-5 (2019–21)
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. The Two Districts as the Hero (Opposing Entities) ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* District 1: Current District Hero Card */}
        <div className="md:col-span-5 relative bg-[#0F1117]/90 border border-orange-500/40 rounded-xl p-4 sm:p-5 shadow-lg overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-400 to-orange-600" />
          <div className="pl-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400">
                Current District
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/25">
                Active Baseline
              </span>
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
              {currentDistrict.district_name}
            </h4>
            <p className="text-xs sm:text-sm font-semibold text-gray-400 mt-1">
              {currentStateName} <span className="text-gray-500 font-normal">({currentStateCode})</span>
            </p>
          </div>
        </div>

        {/* Center "VS" Bridge */}
        <div className="md:col-span-2 flex items-center justify-center py-2 md:py-0">
          <div className="relative flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-[#0F1117] border border-[#2D3148] flex items-center justify-center shadow-lg relative z-10">
              <span className="text-xs font-black tracking-wider text-gray-300">VS</span>
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/20 to-sky-500/20 blur-sm pointer-events-none" />
          </div>
        </div>

        {/* District 2: Comparison District Selector / Hero Card */}
        <div className="md:col-span-5">
          {comparisonDistrictMeta ? (
            /* Selected Comparison District Hero Card */
            <div className="relative bg-[#0F1117]/90 border border-sky-500/40 rounded-xl p-4 sm:p-5 shadow-lg overflow-hidden flex items-center justify-between gap-3 group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-sky-400 to-blue-600" />
              <div className="pl-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400">
                    Compare With
                  </span>
                  {isCrossState && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/25 uppercase tracking-wider">
                      Cross-State
                    </span>
                  )}
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                  {comparisonDistrictMeta.name}
                </h4>
                <p className="text-xs sm:text-sm font-semibold text-gray-400 mt-1">
                  {comparisonDistrictMeta.state_name}{" "}
                  <span className="text-gray-500 font-normal">({comparisonDistrictMeta.state_code})</span>
                </p>
              </div>

              {/* Change / Clear Button */}
              <button
                type="button"
                onClick={() => {
                  setComparisonDistrictMeta(null);
                  setComparisonDistrictData(null);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#1A1D27] hover:bg-[#2D3148] text-gray-300 hover:text-white border border-[#2D3148] text-xs font-bold transition-all cursor-pointer flex-shrink-0 shadow-sm"
              >
                Change
              </button>
            </div>
          ) : (
            /* Search Input with Autocomplete Dropdown */
            <div ref={searchContainerRef} className="relative w-full">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search any district across India..."
                  className="w-full bg-[#0F1117] text-white text-xs sm:text-sm pl-10 pr-4 py-3.5 rounded-xl border border-[#2D3148] focus:border-sky-500 focus:outline-none transition-all placeholder:text-gray-500 shadow-inner"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Same District Warning Banner */}
              {sameDistrictWarning && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 text-xs text-amber-300 flex items-center gap-2">
                  <span>⚠</span>
                  <span>This district is already selected as the active baseline.</span>
                </div>
              )}

              {/* Suggestions Dropdown */}
              {isSearchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-[#1A1D27] border border-[#2D3148] rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-[#2D3148]/60">
                  {searchResults.length > 0 ? (
                    searchResults.map((suggestion, index) => {
                      const isHighlighted = index === highlightedIndex;
                      const isSameState = suggestion.item.state_code === currentStateCode;

                      return (
                        <div
                          key={suggestion.item.id}
                          onClick={() => handleSelectDistrict(suggestion.item)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`px-4 py-2.5 cursor-pointer transition-colors flex items-center justify-between ${
                            isHighlighted ? "bg-sky-500/15 text-white" : "hover:bg-[#242838] text-gray-200"
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs sm:text-sm">{suggestion.item.name}</p>
                            <p className="text-[11px] text-gray-400 font-medium">
                              {suggestion.item.state_name}
                            </p>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              isSameState
                                ? "bg-[#0F1117] text-gray-400 border-[#2D3148]"
                                : "bg-sky-500/10 text-sky-400 border-sky-500/25"
                            }`}
                          >
                            {isSameState ? "Same State" : suggestion.item.state_code}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs text-gray-400">No districts found matching &ldquo;{searchQuery}&rdquo;.</p>
                      {didYouMean && (
                        <div className="mt-2 pt-2 border-t border-[#2D3148]">
                          <p className="text-[11px] text-gray-400">Did you mean:</p>
                          <button
                            type="button"
                            onClick={() => handleSelectDistrict(didYouMean)}
                            className="mt-1 text-xs font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                          >
                            {didYouMean.name}, {didYouMean.state_name}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Unified Comparison Container ───────────────────────────────── */}
      {loadingComparison ? (
        /* Subtle Loading Skeleton */
        <div className="w-full h-72 bg-[#0F1117]/60 border border-[#2D3148] rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-semibold animate-pulse">
            Loading district data...
          </p>
        </div>
      ) : comparisonError ? (
        /* Error Alert */
        <div className="w-full p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-2">
          <p className="text-sm font-bold text-rose-400">{comparisonError}</p>
          <p className="text-xs text-gray-400">Please choose another district to compare.</p>
        </div>
      ) : comparisonDistrictMeta ? (
        /* Unified Comparison Card */
        <div className="w-full bg-[#0F1117]/80 border border-[#2D3148] rounded-2xl p-5 sm:p-7 space-y-6 shadow-lg">
          {/* Indicator Context Header & Selector */}
          <div className="border-b border-[#2D3148]/60 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    {selectedMeta?.label || selectedIndicator}
                  </h4>
                  {/* Direction Badge */}
                  {isNegative ? (
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-wider">
                      Lower = Better
                    </span>
                  ) : (
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                      Higher = Better
                    </span>
                  )}
                  {/* Dataset Badge */}
                  <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-[#1A1D27] text-gray-300 border border-[#2D3148] font-bold uppercase tracking-wider">
                    {activePeriod === "NFHS-6" ? "NFHS-6 · 2023–24" : "NFHS-5 · 2019–21"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {selectedMeta?.description || "Verified NFHS survey indicator comparison."}
                </p>
              </div>

              {/* Change Indicator Action */}
              <div ref={indicatorMenuRef} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsIndicatorMenuOpen((prev) => !prev)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1A1D27] hover:bg-[#242838] border border-[#2D3148] hover:border-orange-500/40 text-xs font-bold text-gray-200 hover:text-white flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-sm"
                >
                  <span>Change Indicator</span>
                  <svg
                    className={`w-3.5 h-3.5 text-orange-400 transform transition-transform ${
                      isIndicatorMenuOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isIndicatorMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 z-40 bg-[#1A1D27] border border-[#2D3148] rounded-xl shadow-2xl max-h-80 overflow-y-auto p-2 space-y-2">
                    {CATEGORY_KEYS.map((catKey) => {
                      const cat = INDICATOR_CATEGORIES[catKey];
                      return (
                        <div key={catKey} className="space-y-1">
                          <p className="text-[9px] font-extrabold text-orange-400 uppercase tracking-widest px-2.5 pt-1">
                            {cat.label}
                          </p>
                          <div className="space-y-0.5">
                            {cat.indicators.map((indKey) => {
                              const meta = METRIC_LABELS[indKey];
                              const isSelected = indKey === selectedIndicator;
                              return (
                                <button
                                  key={indKey}
                                  type="button"
                                  onClick={() => {
                                    setSelectedIndicator(indKey);
                                    setIsIndicatorMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? "bg-orange-500/20 text-orange-400 font-bold"
                                      : "text-gray-300 hover:bg-[#242838] hover:text-white"
                                  }`}
                                >
                                  <span className="truncate">{meta?.label || indKey}</span>
                                  <span className="text-[10px] text-gray-500 ml-2">{meta?.unit}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Missing data fallback notice */}
          {(!hasCurrentVal || !hasComparisonVal) && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-center gap-2.5">
              <span>⚠</span>
              <span>
                Data unavailable for {!hasCurrentVal ? currentDistrict.district_name : comparisonDistrictMeta.name} on{" "}
                {selectedMeta?.label || selectedIndicator} ({activePeriod}).
              </span>
            </div>
          )}

          {/* ── Comparison Visualization (Dueling / Parallel Bars with 0-100% Scale) ── */}
          <div className="relative pt-2 pb-6 px-1">
            {/* Background 0%, 25%, 50%, 75%, 100% Gridlines */}
            <div className="absolute inset-x-1 top-0 bottom-6 flex justify-between pointer-events-none">
              {[0, 25, 50, 75, 100].map((tick) => (
                <div
                  key={tick}
                  className="h-full flex flex-col justify-between items-center"
                  style={{ width: "1px" }}
                >
                  <div className="w-[1px] h-full border-r border-dashed border-[#2D3148]/50" />
                </div>
              ))}
            </div>

            <div className="space-y-6 relative z-10">
              {/* ── District 1 Row (Current District) ───────────────────────── */}
              <div
                onMouseEnter={() => setHoveredDistrict("current")}
                onMouseLeave={() => setHoveredDistrict(null)}
                className={`relative transition-opacity duration-200 cursor-default ${
                  hoveredDistrict === "comparison" ? "opacity-35" : "opacity-100"
                }`}
              >
                {/* Floating Tooltip for Current District */}
                {hoveredDistrict === "current" && (
                  <div className="absolute -top-14 right-2 sm:right-4 z-20 pointer-events-none bg-[#1A1D27]/95 backdrop-blur border border-orange-500/40 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div>
                      <p className="text-xs font-black text-white uppercase leading-tight">
                        {currentDistrict.district_name}, {currentStateName}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {selectedMeta?.label} &bull; {activePeriod === "NFHS-6" ? "NFHS-6 (2023–24)" : "NFHS-5 (2019–21)"}
                      </p>
                    </div>
                    <div className="border-l border-[#2D3148] pl-3">
                      <span className="text-base font-black text-orange-400 tabular-nums">
                        {hasCurrentVal && currentVal !== null ? `${currentVal.toFixed(1)}${unit}` : "—"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Identity Block & Large Value */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 flex-shrink-0" />
                    <div>
                      <span className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                        {currentDistrict.district_name}
                      </span>
                      <span className="text-xs text-gray-400 font-medium ml-2">
                        {currentStateName}
                      </span>
                    </div>
                  </div>

                  {/* Large Value Display */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
                      {hasCurrentVal && currentVal !== null ? `${currentVal.toFixed(1)}${unit}` : "—"}
                    </span>
                    {isPercent && hasCurrentVal && currentVal !== null && (
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">/ 100</span>
                    )}
                  </div>
                </div>

                {/* Horizontal Bar Track & Fill */}
                <div className="h-8 sm:h-9 w-full bg-[#0F1117] rounded-xl overflow-hidden p-1 border border-[#2D3148]/60 relative shadow-inner">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 relative shadow-md shadow-orange-950/40 transition-all duration-500 ease-out"
                    style={{
                      width: hasCurrentVal ? `${Math.max(2, Math.min(100, currentPct))}%` : "0%",
                    }}
                  >
                    {/* Subtle top shine */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-white/35 rounded-t-lg" />
                  </div>
                </div>
              </div>

              {/* ── Neutral Center Comparison Element (District Gap) ──────── */}
              <div className="py-1 flex items-center justify-center">
                <div className="relative flex items-center justify-center w-full">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2D3148]/60" />
                  </div>
                  <div className="relative px-5 py-2 rounded-xl bg-[#0F1117] border border-[#2D3148] shadow-md flex items-center gap-3">
                    <div className="text-center">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 block">
                        District Gap
                      </span>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-lg sm:text-xl font-black text-white tabular-nums">
                          {districtGap !== null ? districtGap : "—"}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">
                          {unit === "%" ? "pp" : unit}
                        </span>
                      </div>
                    </div>
                    {districtGap !== null && (
                      <div className="border-l border-[#2D3148] pl-3 hidden sm:block">
                        <span className="text-[10px] font-medium text-gray-400 block">
                          {isNegative ? "Lower value = preferable" : "Higher value = preferable"}
                        </span>
                        <span className="text-[10px] text-gray-500 font-normal">
                          Neutral gap analysis
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── District 2 Row (Comparison District) ───────────────────── */}
              <div
                onMouseEnter={() => setHoveredDistrict("comparison")}
                onMouseLeave={() => setHoveredDistrict(null)}
                className={`relative transition-opacity duration-200 cursor-default ${
                  hoveredDistrict === "current" ? "opacity-35" : "opacity-100"
                }`}
              >
                {/* Floating Tooltip for Comparison District */}
                {hoveredDistrict === "comparison" && (
                  <div className="absolute -top-14 right-2 sm:right-4 z-20 pointer-events-none bg-[#1A1D27]/95 backdrop-blur border border-sky-500/40 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div>
                      <p className="text-xs font-black text-white uppercase leading-tight">
                        {comparisonDistrictMeta.name}, {comparisonDistrictMeta.state_name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {selectedMeta?.label} &bull; {activePeriod === "NFHS-6" ? "NFHS-6 (2023–24)" : "NFHS-5 (2019–21)"}
                      </p>
                    </div>
                    <div className="border-l border-[#2D3148] pl-3">
                      <span className="text-base font-black text-sky-400 tabular-nums">
                        {hasComparisonVal && comparisonVal !== null ? `${comparisonVal.toFixed(1)}${unit}` : "—"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Identity Block & Large Value */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-sky-400 shadow-sm shadow-sky-500/50 flex-shrink-0" />
                    <div>
                      <span className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                        {comparisonDistrictMeta.name}
                      </span>
                      <span className="text-xs text-gray-400 font-medium ml-2">
                        {comparisonDistrictMeta.state_name}
                      </span>
                    </div>
                  </div>

                  {/* Large Value Display */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
                      {hasComparisonVal && comparisonVal !== null ? `${comparisonVal.toFixed(1)}${unit}` : "—"}
                    </span>
                    {isPercent && hasComparisonVal && comparisonVal !== null && (
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">/ 100</span>
                    )}
                  </div>
                </div>

                {/* Horizontal Bar Track & Fill */}
                <div className="h-8 sm:h-9 w-full bg-[#0F1117] rounded-xl overflow-hidden p-1 border border-[#2D3148]/60 relative shadow-inner">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-sky-600 via-sky-500 to-blue-400 relative shadow-md shadow-sky-950/40 transition-all duration-500 ease-out"
                    style={{
                      width: hasComparisonVal ? `${Math.max(2, Math.min(100, comparisonPct))}%` : "0%",
                    }}
                  >
                    {/* Subtle top shine */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-white/35 rounded-t-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Scale Tick Labels */}
            <div className="absolute inset-x-1 bottom-0 flex justify-between pointer-events-none text-[10px] text-gray-500 font-semibold select-none pt-2">
              <span>0{unit}</span>
              <span>{Math.round(maxScaleVal * 0.25)}{unit}</span>
              <span>{Math.round(maxScaleVal * 0.5)}{unit}</span>
              <span>{Math.round(maxScaleVal * 0.75)}{unit}</span>
              <span>{maxScaleVal}{unit}</span>
            </div>
          </div>

          {/* ── Neutral Bottom Summary Bar ──────────────────────────────────── */}
          <div className="pt-4 border-t border-[#2D3148]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-gray-300 font-medium">{currentDistrict.district_name}</span>
                <span className="text-white font-bold tabular-nums">
                  {hasCurrentVal && currentVal !== null ? `${currentVal.toFixed(1)}${unit}` : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-gray-300 font-medium">{comparisonDistrictMeta.name}</span>
                <span className="text-white font-bold tabular-nums">
                  {hasComparisonVal && comparisonVal !== null ? `${comparisonVal.toFixed(1)}${unit}` : "—"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-[11px]">
              <span>Guidance:</span>
              <span className="text-gray-200 font-semibold">
                {isNegative ? "Lower outcome is preferable" : "Higher outcome is preferable"}
              </span>
              <span className="text-gray-500">&bull; Same period comparison</span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State with Prompt & Quick Preset Chips */
        <div className="w-full bg-[#0F1117]/60 border border-dashed border-[#2D3148] rounded-2xl p-8 sm:p-10 text-center space-y-4 shadow-inner">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto text-xl font-black">
            ✦
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
              Compare With a District
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Search any district across India to view a direct intelligence comparison of{" "}
              <strong className="text-gray-300">{selectedMeta?.label}</strong>.
            </p>
          </div>

          {/* Quick Preset Exploration Chips */}
          {quickPresets.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2.5">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {quickPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectDistrict(preset)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#1A1D27] hover:bg-[#242838] border border-[#2D3148] hover:border-sky-500/40 text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{preset.name}</span>
                    <span className="text-[10px] text-gray-500 font-normal">({preset.state_name})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
