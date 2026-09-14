"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { DistrictMetrics } from "@/lib/types/district";
import { METRIC_LABELS, INDICATOR_CATEGORIES } from "@/lib/constants";
import { getStateAverage } from "@/lib/ml-utils";
import { damerauLevenshtein, jaroWinkler, normalizeStr } from "@/lib/fuzzy-search";

interface DataExplorerProps {
  district: DistrictMetrics;
  allDistricts: DistrictMetrics[];
}

interface RankedSuggestion {
  field: string;
  label: string;
  description: string;
  category: string;
  score: number;
  matchType: "exact" | "prefix" | "word-prefix" | "contains" | "fuzzy";
  isDirect: boolean;
  matchedRange?: [number, number];
}

/**
 * Subtly highlight matching substring or words in the indicator label
 */
function HighlightedText({
  text,
  query,
  range,
}: {
  text: string;
  query: string;
  range?: [number, number];
}) {
  if (range && range[0] >= 0 && range[1] > range[0]) {
    const before = text.slice(0, range[0]);
    const match = text.slice(range[0], range[1]);
    const after = text.slice(range[1]);
    return (
      <span>
        {before}
        <span className="text-orange-400 font-bold bg-orange-500/20 px-0.5 rounded">
          {match}
        </span>
        {after}
      </span>
    );
  }

  const qWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (qWords.length === 0) return <span>{text}</span>;

  const escaped = qWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="text-orange-400 font-bold bg-orange-500/20 px-0.5 rounded">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

/**
 * Score and rank an indicator against user search text
 * Priority:
 * Exact match -> Starts with -> Word starts with -> Contains -> Fuzzy similarity
 */
function scoreIndicator(
  query: string,
  field: string,
  label: string,
  description: string,
  category: string
): RankedSuggestion | null {
  const q = normalizeStr(query);
  const t = normalizeStr(label);

  if (!q) return null;

  // 1. Exact name match
  if (t === q) {
    return {
      field,
      label,
      description,
      category,
      score: 1000,
      matchType: "exact",
      isDirect: true,
      matchedRange: [0, label.length],
    };
  }

  // 2. Starts with search text (Prefix match)
  if (t.startsWith(q)) {
    const penalty = Math.min(50, t.length - q.length);
    return {
      field,
      label,
      description,
      category,
      score: 900 - penalty,
      matchType: "prefix",
      isDirect: true,
      matchedRange: [0, q.length],
    };
  }

  // 3. Word starts with search text (e.g. "sanit" in "Improved Sanitation", "contracep" in "Modern Contraceptive Use")
  const targetWords = t.split(/[\s\-&/,()]+/).filter(Boolean);
  const lowerLabel = label.toLowerCase();
  for (const word of targetWords) {
    if (word.startsWith(q)) {
      const wordIdx = lowerLabel.indexOf(word);
      const penalty = Math.min(50, t.length - q.length);
      return {
        field,
        label,
        description,
        category,
        score: 750 - penalty,
        matchType: "word-prefix",
        isDirect: true,
        matchedRange: wordIdx >= 0 ? [wordIdx, wordIdx + q.length] : undefined,
      };
    }
  }

  // 4. Contains search text (Substring match)
  const subIdx = lowerLabel.indexOf(q);
  if (subIdx >= 0) {
    const penalty = Math.min(100, subIdx * 5 + (t.length - q.length));
    return {
      field,
      label,
      description,
      category,
      score: 600 - penalty,
      matchType: "contains",
      isDirect: true,
      matchedRange: [subIdx, subIdx + q.length],
    };
  }

  // Multi-word matching (e.g. "child anemia" -> "Child Anaemia")
  const qWords = q.split(/\s+/).filter(Boolean);
  if (qWords.length > 1) {
    const allWordsMatch = qWords.every((qw) =>
      targetWords.some((tw) => tw.startsWith(qw) || damerauLevenshtein(qw, tw) <= 1)
    );
    if (allWordsMatch) {
      const hasTypo = qWords.some((qw) => !targetWords.some((tw) => tw.startsWith(qw)));
      if (hasTypo) {
        return {
          field,
          label,
          description,
          category,
          score: 520,
          matchType: "fuzzy",
          isDirect: false,
        };
      } else {
        return {
          field,
          label,
          description,
          category,
          score: 680,
          matchType: "word-prefix",
          isDirect: true,
        };
      }
    }
  }

  // 5. Fuzzy similarity on full string & individual words
  const dist = damerauLevenshtein(q, t);
  const jw = jaroWinkler(q, t);

  let bestWordDist = dist;
  let bestWordJw = jw;
  let bestWordIdx = -1;
  for (const word of targetWords) {
    const wd = damerauLevenshtein(q, word);
    const wjw = jaroWinkler(q, word);
    if (wd < bestWordDist) {
      bestWordDist = wd;
      bestWordIdx = lowerLabel.indexOf(word);
    }
    if (wjw > bestWordJw) {
      bestWordJw = wjw;
      if (bestWordIdx === -1) bestWordIdx = lowerLabel.indexOf(word);
    }
  }

  const effectiveDist = Math.min(dist, bestWordDist);
  const effectiveJw = Math.max(jw, bestWordJw);
  const maxLen = Math.max(q.length, t.length);

  const isFuzzyMatch =
    (effectiveDist <= 1 && effectiveJw >= 0.7) ||
    (effectiveDist <= 2 && q.length >= 5 && effectiveJw >= 0.75) ||
    (effectiveDist <= 3 && q.length >= 8 && effectiveJw >= 0.8) ||
    (effectiveJw >= 0.84);

  if (isFuzzyMatch) {
    const score = Math.round(effectiveJw * 350 + (1 - effectiveDist / maxLen) * 100);
    return {
      field,
      label,
      description,
      category,
      score,
      matchType: "fuzzy",
      isDirect: false,
      matchedRange: bestWordIdx >= 0 ? [bestWordIdx, bestWordIdx + (targetWords[0]?.length || q.length)] : undefined,
    };
  }

  // Fallback: description contains query
  const d = normalizeStr(description);
  if (d.includes(q)) {
    return {
      field,
      label,
      description,
      category,
      score: 150,
      matchType: "contains",
      isDirect: true,
    };
  }

  return null;
}

export default function DataExplorer({ district, allDistricts }: DataExplorerProps) {
  const [search, setSearch] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stateAverages = getStateAverage(allDistricts);

  // Helper to resolve category display label
  const getCategoryLabel = (field: string) => {
    for (const [, catInfo] of Object.entries(INDICATOR_CATEGORIES)) {
      if ((catInfo.indicators as readonly string[]).includes(field)) {
        return catInfo.label;
      }
    }
    return "Demographics";
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Compute autocomplete suggestions dynamically from existing dataset
  const { suggestions, hasDirectMatches } = useMemo(() => {
    const q = search.trim();
    if (!q) {
      return { suggestions: [], hasDirectMatches: false };
    }

    const scored: RankedSuggestion[] = [];

    for (const [field, meta] of Object.entries(METRIC_LABELS)) {
      const catLabel = getCategoryLabel(field);
      const res = scoreIndicator(q, field, meta.label, meta.description, catLabel);
      if (res && res.score > 0) {
        scored.push(res);
      }
    }

    // Sort by ranking priority: Exact -> Starts with -> Word starts with -> Contains -> Fuzzy
    scored.sort((a, b) => b.score - a.score);

    const direct = scored.filter((s) => s.isDirect);
    const hasDirect = direct.length > 0;

    // Limit to the best 5 suggestions
    const finalSuggestions = hasDirect ? direct.slice(0, 5) : scored.slice(0, 5);

    return {
      suggestions: finalSuggestions,
      hasDirectMatches: hasDirect,
    };
  }, [search]);

  // Select an indicator
  const handleSelectIndicator = (field: string) => {
    setSelectedIndicator(field);
    const meta = METRIC_LABELS[field];
    if (meta) {
      setSearch(meta.label);
    }
    setIsDropdownOpen(false);
    setActiveIndex(-1);
  };

  // Clear search and reset state to pure empty search state
  const handleClearSearch = () => {
    setSearch("");
    setSelectedIndicator(null);
    setIsDropdownOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  // Handle typing in search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setActiveIndex(-1);
    if (selectedIndicator) {
      setSelectedIndicator(null);
    }
    setIsDropdownOpen(val.trim().length > 0);
  };

  // Keyboard navigation for autocomplete dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      if (e.key === "Enter" && !selectedIndicator && suggestions.length > 0) {
        e.preventDefault();
        handleSelectIndicator(suggestions[0].field);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetIdx = activeIndex >= 0 ? activeIndex : 0;
      if (suggestions[targetIdx]) {
        handleSelectIndicator(suggestions[targetIdx].field);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
  };

  const getCategoryBadge = (field: string) => {
    const catLabel = getCategoryLabel(field);
    return (
      <span className="text-[10px] bg-[#0F1117] border border-[#2D3148] px-2.5 py-0.5 rounded-full text-gray-400 capitalize font-medium">
        {catLabel}
      </span>
    );
  };

  const activeMeta = selectedIndicator ? METRIC_LABELS[selectedIndicator] : null;
  const activeVal = selectedIndicator ? district[selectedIndicator as keyof DistrictMetrics] : null;
  const valNumber = typeof activeVal === "number" ? activeVal : null;
  const stateAvg = selectedIndicator ? stateAverages[selectedIndicator] : undefined;
  const hasGap = valNumber !== null && stateAvg !== undefined;
  const gap = hasGap ? valNumber - stateAvg : null;
  const isZero = gap !== null ? Math.abs(gap) < 0.05 : false;
  const isBetter =
    gap !== null && activeMeta
      ? activeMeta.direction === "positive"
        ? gap > 0
        : gap < 0
      : null;

  return (
    <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Data Explorer</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Browse and search available indicators...
          </p>
        </div>

        {/* Search Bar + Clear / Search Another */}
        <div className="flex items-center gap-2.5 max-w-sm w-full md:justify-end">
          {selectedIndicator && (
            <button
              onClick={handleClearSearch}
              className="px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:border-orange-500/50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap flex-shrink-0"
              title="Search another indicator"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search Another</span>
            </button>
          )}

          <div ref={searchContainerRef} className="relative w-full">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (search.trim()) setIsDropdownOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search indicators..."
                aria-autocomplete="list"
                aria-expanded={isDropdownOpen}
                className="w-full rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:outline-none text-xs text-white pl-9 pr-8 py-2.5 transition-colors"
              />
              <svg
                className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#1A1D27] border border-[#2D3148] rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
                {!hasDirectMatches && suggestions.length > 0 && (
                  <div className="px-3.5 py-2.5 bg-amber-500/10 border-b border-[#2D3148] text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>No matching indicator found.</span>
                    </div>
                    <p className="text-[11px] text-orange-400 font-bold mt-1">
                      Did you mean?
                    </p>
                  </div>
                )}

                {suggestions.length > 0 ? (
                  <ul role="listbox" className="divide-y divide-[#2D3148]/50 max-h-72 overflow-y-auto">
                    {suggestions.map((item, index) => {
                      const isHighlighted = activeIndex === index;
                      return (
                        <li
                          key={item.field}
                          role="option"
                          aria-selected={isHighlighted}
                          onMouseEnter={() => setActiveIndex(index)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectIndicator(item.field);
                          }}
                          className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            isHighlighted
                              ? "bg-orange-500/15 border-l-2 border-l-orange-500"
                              : "hover:bg-[#242838]/60"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">
                              <HighlightedText
                                text={item.label}
                                query={search}
                                range={item.matchedRange}
                              />
                            </p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
                              {item.description}
                            </p>
                          </div>
                          <span className="text-[10px] bg-[#0F1117] border border-[#2D3148] px-2 py-0.5 rounded-full text-gray-400 flex-shrink-0 whitespace-nowrap">
                            {item.category}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-4 py-4 text-center text-xs text-gray-400">
                    <p className="font-medium text-gray-300">No matching indicator found.</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Try searching another indicator like Sex Ratio or Literacy Rate.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Indicator Result Display (Only shown when an indicator is selected) */}
      {selectedIndicator && activeMeta && (
        <div className="mt-6 overflow-x-auto border border-[#2D3148] rounded-xl overflow-hidden animate-fade-in">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#2D3148] bg-[#0F1117]/50 text-gray-400 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3">Indicator</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">District Value</th>
                <th className="px-4 py-3 text-right">State Average</th>
                <th className="px-4 py-3 text-right">Difference</th>
                <th className="px-4 py-3 text-center">Period / Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D3148]">
              <tr className="hover:bg-[#242838]/30 transition-colors">
                <td className="px-4 py-3.5 max-w-xs">
                  <p className="text-white font-semibold text-sm">{activeMeta.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{activeMeta.description}</p>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {getCategoryBadge(selectedIndicator)}
                </td>
                <td className="px-4 py-3.5 text-right font-bold text-white whitespace-nowrap">
                  {valNumber !== null ? (
                    <span className="tabular-nums text-sm">
                      {valNumber.toFixed(1)}
                      <span className="text-[10px] text-gray-400 font-normal ml-0.5">{activeMeta.unit}</span>
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-medium text-gray-300 whitespace-nowrap">
                  {stateAvg !== undefined ? (
                    <span className="tabular-nums">
                      {stateAvg.toFixed(1)}
                      <span className="text-[10px] text-gray-500 ml-0.5">{activeMeta.unit}</span>
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-semibold whitespace-nowrap">
                  {gap !== null ? (
                    <div className="flex flex-col items-end">
                      <span
                        className={`tabular-nums ${
                          isZero
                            ? "text-gray-400"
                            : isBetter
                            ? "text-[#66BB6A]"
                            : "text-[#EF5350]"
                        }`}
                      >
                        {gap > 0 ? "+" : ""}
                        {gap.toFixed(1)}
                        <span className="text-[10px] ml-0.5 text-gray-500 font-normal">
                          {activeMeta.unit}
                        </span>
                      </span>
                      <span
                        className={`text-[9px] font-medium uppercase tracking-wider ${
                          isZero
                            ? "text-gray-500"
                            : isBetter
                            ? "text-[#66BB6A]/80"
                            : "text-[#EF5350]/80"
                        }`}
                      >
                        {isZero ? "Par with state" : isBetter ? "Above benchmark" : "Below benchmark"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-center text-[10px] text-gray-500 whitespace-nowrap">
                  <span className="block font-medium text-gray-300">{district.metadata.year}</span>
                  <span className="block text-[9px] text-gray-500">{district.metadata.source}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
