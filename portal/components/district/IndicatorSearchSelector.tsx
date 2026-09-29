"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { METRIC_LABELS, INDICATOR_CATEGORIES } from "@/lib/constants";
import { damerauLevenshtein, jaroWinkler, normalizeStr } from "@/lib/fuzzy-search";

export interface IndicatorSearchSelectorProps {
  selectedIndicator: string;
  onSelectIndicator: (indicatorKey: string) => void;
  className?: string;
}

interface IndicatorItem {
  id: string;
  label: string;
  unit: string;
  description: string;
  category: string;
  categoryKey: string;
  aliases: string[];
}

interface ScoredIndicator {
  item: IndicatorItem;
  score: number;
  matchType: "exact" | "prefix" | "word-prefix" | "contains" | "category" | "alias" | "fuzzy";
  isDirect: boolean;
}

/**
 * Domain-specific aliases and common search terms mapped to indicator keys
 */
const INDICATOR_ALIASES: Record<string, string[]> = {
  child_anaemia: [
    "child anemia", "children anaemia", "children anemia", "anemia", "anaemia",
    "anaemic kids", "anaemic children", "anemic kids", "kids with anaemia",
    "hemoglobin", "haemoglobin", "iron deficiency", "blood deficiency"
  ],
  child_underweight: [
    "underweight", "under weight", "child underweight", "low weight for age",
    "weight for age", "malnourished child", "underweight kids"
  ],
  women_anaemia: [
    "women anemia", "female anaemia", "female anemia", "pregnant anaemia",
    "pregnant anemia", "maternal anaemia", "anaemic mothers", "anaemic women"
  ],
  full_vaccination: [
    "vaccination", "vaccine", "vaccines", "vaccinated", "immunization",
    "immunised", "immunized", "full immunization", "child vaccination", "shots",
    "bcg", "polio", "dpt", "pentavalent", "measles"
  ],
  child_stunting: [
    "stunting", "stunted", "child stunting", "short for age", "height for age",
    "chronic malnutrition", "growth faltering", "low height"
  ],
  institutional_births: [
    "institutional delivery", "institutional birth", "hospital delivery",
    "hospital births", "deliveries in hospital", "safe delivery", "birth in clinic",
    "maternal delivery", "skilled birth attendance", "jsy"
  ],
  literacy_rate: [
    "literacy", "literate", "female literacy", "women literacy", "education",
    "reading writing", "can read and write"
  ],
  child_wasting: [
    "wasting", "wasted", "child wasting", "acute malnutrition", "weight for height",
    "low weight for height", "sam", "severe acute malnutrition", "emaciated"
  ],
  anc_4_visits: [
    "anc", "antenatal", "antenatal care", "prenatal", "prenatal care",
    "4 anc visits", "pregnancy checkup", "doctor visits pregnancy"
  ],
  pnc_within_2_days: [
    "pnc", "postnatal", "postnatal care", "postpartum", "postpartum care",
    "care after delivery", "checkup after birth"
  ],
  health_insurance: [
    "insurance", "health insurance", "ayushman", "ayushman bharat", "mediclaim",
    "medical insurance", "health coverage", "health scheme"
  ],
  exclusive_breastfeeding: [
    "breastfeeding", "breast feeding", "breast feed", "exclusive breastfeeding",
    "infant feeding", "mother milk"
  ],
  adequate_diet: [
    "adequate diet", "minimum diet", "dietary diversity", "child diet",
    "complementary feeding", "nutrition diet", "infant food"
  ],
  women_schooling_10_years: [
    "women schooling", "female schooling", "girls schooling", "girls education",
    "women 10 years schooling", "female education", "educated women", "10 years school"
  ],
  early_marriage: [
    "early marriage", "child marriage", "married before 18", "underage marriage",
    "girl child marriage", "marriage under 18"
  ],
  teenage_pregnancy: [
    "teen pregnancy", "teenage pregnancy", "adolescent pregnancy", "teen mothers",
    "childbearing 15-19"
  ],
  modern_contraceptive: [
    "contraceptive", "contraception", "family planning", "birth control",
    "modern contraceptive", "condom", "sterilization", "iud"
  ],
  women_bank_account: [
    "bank account", "bank accounts", "women bank", "financial inclusion",
    "women banking", "jan dhan"
  ],
  women_decision_making: [
    "decision making", "household decisions", "women decision", "empowerment",
    "autonomy"
  ],
  school_attendance_6_17: [
    "school attendance", "children in school", "kids going to school",
    "school going", "enrolment", "enrollment"
  ],
  dropout_rate: [
    "dropout", "drop out", "school dropout", "leaving school", "dropout rate"
  ],
  learning_proficiency: [
    "learning proficiency", "aser", "parakh", "learning levels", "reading math",
    "proficiency"
  ],
  retention_rate: [
    "retention", "retention rate", "school retention", "staying in school"
  ],
  electricity_access: [
    "electricity", "power", "lights", "power access", "electrified", "power supply"
  ],
  drinking_water_improved: [
    "drinking water", "clean water", "water access", "tap water", "safe water",
    "piped water", "jal jeevan"
  ],
  sanitation_facility_improved: [
    "sanitation", "toilet", "toilets", "latrine", "latrines", "flush toilet",
    "swachh", "swachh bharat", "improved sanitation", "clean toilet"
  ],
  clean_cooking_fuel: [
    "cooking fuel", "clean fuel", "lpg", "gas cylinder", "clean cooking",
    "ujjwala", "png", "cooking gas"
  ],
  housing_solid: [
    "housing", "pucca house", "pucca housing", "solid housing", "shelter",
    "pmay", "permanent house"
  ],
  internet_access: [
    "internet", "internet access", "online access", "web access", "digital",
    "smartphone internet"
  ],
  bp_screening: [
    "blood pressure", "hypertension", "bp screening", "bp test", "high blood pressure"
  ],
  diabetes_screening: [
    "diabetes", "blood sugar", "sugar test", "glucose screening", "diabetic"
  ],
  sex_ratio: [
    "sex ratio", "gender ratio", "female ratio", "girls per 1000 boys",
    "females per 1000 males", "sex ratio at birth"
  ],
};

/**
 * Top popular indicators displayed when the search input is focused but empty
 */
const POPULAR_INDICATOR_KEYS = [
  "child_anaemia",
  "child_underweight",
  "women_anaemia",
  "full_vaccination",
  "institutional_births",
  "child_stunting",
];

export default function IndicatorSearchSelector({
  selectedIndicator,
  onSelectIndicator,
  className = "",
}: IndicatorSearchSelectorProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Build the complete in-memory indicator list once
  const allIndicators = useMemo<IndicatorItem[]>(() => {
    return Object.entries(METRIC_LABELS).map(([key, meta]) => {
      let category = "Demographics";
      let categoryKey = "demographics";

      for (const [cKey, cVal] of Object.entries(INDICATOR_CATEGORIES)) {
        if ((cVal.indicators as readonly string[]).includes(key)) {
          category = cVal.label;
          categoryKey = cKey;
          break;
        }
      }

      return {
        id: key,
        label: meta.label,
        unit: meta.unit || "%",
        description: meta.description || "",
        category,
        categoryKey,
        aliases: INDICATOR_ALIASES[key] || [],
      };
    });
  }, []);

  // Popular indicators list for empty search
  const popularIndicators = useMemo(() => {
    return POPULAR_INDICATOR_KEYS.map((k) =>
      allIndicators.find((ind) => ind.id === k)
    ).filter(Boolean) as IndicatorItem[];
  }, [allIndicators]);

  // Click outside listener to close suggestion panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keyboard shortcut: Ctrl+K or Cmd+K to focus search input
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Compute scored and ranked suggestions in real time
  const { results, isDidYouMean } = useMemo(() => {
    const q = normalizeStr(query);
    if (!q) {
      return { results: [], isDidYouMean: false };
    }

    const scored: ScoredIndicator[] = [];

    for (const item of allIndicators) {
      const labelNorm = normalizeStr(item.label);
      const catNorm = normalizeStr(item.category);

      // 1. Exact match on indicator name
      if (labelNorm === q) {
        scored.push({ item, score: 1000, matchType: "exact", isDirect: true });
        continue;
      }

      // 2. Starts with search query (Prefix match)
      if (labelNorm.startsWith(q)) {
        const penalty = Math.min(50, labelNorm.length - q.length);
        scored.push({ item, score: 900 - penalty, matchType: "prefix", isDirect: true });
        continue;
      }

      // 3. Word starts with search query (e.g. "anaem" matches "Child Anaemia")
      const words = labelNorm.split(/[\s\-&/,()]+/).filter(Boolean);
      let matchedWord = false;
      for (const w of words) {
        if (w.startsWith(q)) {
          const penalty = Math.min(50, labelNorm.length - q.length);
          scored.push({ item, score: 800 - penalty, matchType: "word-prefix", isDirect: true });
          matchedWord = true;
          break;
        }
      }
      if (matchedWord) continue;

      // 4. Contains search query as substring
      if (labelNorm.includes(q)) {
        const subIdx = labelNorm.indexOf(q);
        const penalty = Math.min(100, subIdx * 5 + (labelNorm.length - q.length));
        scored.push({ item, score: 650 - penalty, matchType: "contains", isDirect: true });
        continue;
      }

      // 5. Alias / synonym match
      let aliasMatch = false;
      for (const alias of item.aliases) {
        const aliasNorm = normalizeStr(alias);
        if (aliasNorm === q) {
          scored.push({ item, score: 750, matchType: "alias", isDirect: true });
          aliasMatch = true;
          break;
        } else if (aliasNorm.startsWith(q)) {
          scored.push({ item, score: 720, matchType: "alias", isDirect: true });
          aliasMatch = true;
          break;
        } else if (aliasNorm.includes(q)) {
          scored.push({ item, score: 600, matchType: "alias", isDirect: true });
          aliasMatch = true;
          break;
        }
      }
      if (aliasMatch) continue;

      // 6. Category match (e.g. user searches "health", "women", "nutrition")
      if (catNorm.includes(q) || item.categoryKey.includes(q)) {
        scored.push({ item, score: 550, matchType: "category", isDirect: true });
        continue;
      }

      // 7. Fuzzy match / Typo tolerance (e.g. "anaemai" -> "anaemia", "vacin" -> "vaccine")
      // A. Word-level Damerau-Levenshtein distance
      let bestFuzzyDistance = 99;
      for (const w of words) {
        if (Math.abs(w.length - q.length) <= 2) {
          const dist = damerauLevenshtein(q, w);
          if (dist < bestFuzzyDistance) bestFuzzyDistance = dist;
        }
      }

      // Check aliases for fuzzy distance as well
      for (const alias of item.aliases) {
        const aliasWords = alias.split(/\s+/);
        for (const aw of aliasWords) {
          if (Math.abs(aw.length - q.length) <= 2) {
            const dist = damerauLevenshtein(q, aw);
            if (dist < bestFuzzyDistance) bestFuzzyDistance = dist;
          }
        }
      }

      if (bestFuzzyDistance <= 1) {
        scored.push({ item, score: 450, matchType: "fuzzy", isDirect: false });
        continue;
      } else if (bestFuzzyDistance === 2 && q.length >= 5) {
        scored.push({ item, score: 400, matchType: "fuzzy", isDirect: false });
        continue;
      }

      // B. Jaro-Winkler similarity on whole label or aliases
      const jwScore = jaroWinkler(q, labelNorm);
      if (jwScore >= 0.78 && q.length >= 4) {
        scored.push({ item, score: 350 + Math.round(jwScore * 50), matchType: "fuzzy", isDirect: false });
      }
    }

    // Sort by priority ranking
    scored.sort((a, b) => b.score - a.score);

    const direct = scored.filter((s) => s.isDirect);
    const hasDirect = direct.length > 0;

    // If direct matches exist, show top direct; otherwise show close fuzzy suggestions
    const finalResults = hasDirect ? direct.slice(0, 7) : scored.slice(0, 5);

    return {
      results: finalResults,
      isDidYouMean: !hasDirect && finalResults.length > 0,
    };
  }, [query, allIndicators]);

  // Handle selection of an indicator
  const handleSelect = useCallback(
    (indicatorId: string) => {
      onSelectIndicator(indicatorId);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onSelectIndicator]
  );

  // Clear search input
  const handleClear = () => {
    setQuery("");
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    const currentList = query.trim() ? results.map((r) => r.item) : popularIndicators;
    const totalCount = currentList.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalCount ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalCount - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < totalCount) {
        handleSelect(currentList[highlightedIndex].id);
      } else if (currentList.length > 0) {
        handleSelect(currentList[0].id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Auto-scroll highlighted suggestion into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-indicator-item]");
      const target = items[highlightedIndex] as HTMLElement;
      if (target) {
        target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Compact Search Input Field ── */}
      <div className="relative flex items-center">
        {/* Magnifying Glass Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
              d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(-1);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search indicators..."
          aria-label="Search indicators"
          className="w-full pl-9 pr-14 py-2 rounded-xl bg-[#0F1117] hover:bg-[#12141D] border border-[#2D3148] focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/40 focus:outline-none text-xs text-white placeholder-gray-500 font-medium transition-all shadow-inner"
        />

        {/* Clear Button (×) or Keyboard Shortcut Badge */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              title="Clear search"
              aria-label="Clear search"
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#242838] transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-gray-500 bg-[#1A1D27] border border-[#2D3148] rounded">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* ── Dropdown Suggestion Panel ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-full sm:w-80 md:w-96 z-50 bg-[#1A1D27] border border-[#2D3148] rounded-xl shadow-2xl overflow-hidden animate-fade-in max-h-80 flex flex-col">
          {/* Header Title */}
          <div className="px-3.5 py-2 bg-[#141722] border-b border-[#2D3148]/60 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <span>
              {!query.trim()
                ? "Popular Indicators"
                : isDidYouMean
                ? "Did you mean?"
                : "Suggested Indicators"}
            </span>
            <span className="text-[9px] text-gray-500 font-normal">
              {!query.trim() ? "Or type to search" : `${results.length} found`}
            </span>
          </div>

          {/* Results List */}
          <div ref={listRef} className="overflow-y-auto divide-y divide-[#2D3148]/40 p-1 space-y-0.5 flex-1">
            {/* Empty Search: Show Popular Indicators */}
            {!query.trim() && (
              <>
                {popularIndicators.map((item, idx) => {
                  const isSelected = item.id === selectedIndicator;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-indicator-item
                      onClick={() => handleSelect(item.id)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-orange-500/15 border-l-2 border-orange-500"
                          : isHighlighted
                          ? "bg-[#242838] border-l-2 border-orange-400"
                          : "hover:bg-[#242838] border-l-2 border-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected ? "text-orange-400 font-bold" : "text-gray-200"
                            }`}
                          >
                            {item.label}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-orange-400 font-bold">✓</span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                          {item.category}
                        </span>
                      </div>
                      {item.unit && (
                        <span className="text-[10px] font-mono font-medium text-gray-400 flex-shrink-0 px-1.5 py-0.5 rounded bg-[#0F1117] border border-[#2D3148]">
                          {item.unit}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {/* When user has typed query and results exist */}
            {query.trim() && results.length > 0 && (
              <>
                {results.map(({ item }, idx) => {
                  const isSelected = item.id === selectedIndicator;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-indicator-item
                      onClick={() => handleSelect(item.id)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-orange-500/15 border-l-2 border-orange-500"
                          : isHighlighted
                          ? "bg-[#242838] border-l-2 border-orange-400"
                          : "hover:bg-[#242838] border-l-2 border-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isDidYouMean && (
                            <span className="text-orange-400 text-xs font-bold flex-shrink-0">
                              →
                            </span>
                          )}
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected ? "text-orange-400 font-bold" : "text-gray-200"
                            }`}
                          >
                            {item.label}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-orange-400 font-bold">✓</span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                          {item.category}
                        </span>
                      </div>
                      {item.unit && (
                        <span className="text-[10px] font-mono font-medium text-gray-400 flex-shrink-0 px-1.5 py-0.5 rounded bg-[#0F1117] border border-[#2D3148]">
                          {item.unit}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {/* No Results Found State */}
            {query.trim() && results.length === 0 && (
              <div className="p-4 text-center space-y-1.5">
                <p className="text-xs text-gray-300 font-semibold">
                  No indicators found for &ldquo;<span className="text-orange-400">{query}</span>&rdquo;
                </p>
                <p className="text-[10.5px] text-gray-500 leading-normal">
                  Try searching for <span className="text-gray-400">health</span>,{" "}
                  <span className="text-gray-400">nutrition</span>,{" "}
                  <span className="text-gray-400">anaemia</span>,{" "}
                  <span className="text-gray-400">vaccination</span>, or{" "}
                  <span className="text-gray-400">education</span>...
                </p>
              </div>
            )}
          </div>

          {/* Footer Guide Note */}
          <div className="px-3 py-1.5 bg-[#141722] border-t border-[#2D3148]/60 flex items-center justify-between text-[9px] text-gray-500">
            <span>↑↓ to navigate · Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
