/**
 * Comprehensive fuzzy search and string similarity utilities for district and state names.
 * Supports:
 * - Typo tolerance (missing letters, extra letters, swapped/transposed letters)
 * - Exact, prefix, and substring matching with hierarchical rank weighting
 * - Token/word-level matching for multi-word district names
 * - Fast execution (< 2ms for all Indian districts)
 */

/**
 * Calculate Damerau-Levenshtein distance between two strings.
 * Handles insertions, deletions, substitutions, and transpositions of adjacent characters.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let min = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition check
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        min = Math.min(min, matrix[i - 2][j - 2] + 1);
      }

      matrix[i][j] = min;
    }
  }

  return matrix[al][bl];
}

/**
 * Calculate Jaro-Winkler similarity score (0.0 to 1.0).
 * Ideal for proper names and tolerant of spelling variations.
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;

  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);

    for (let j = start; j < end; j++) {
      if (matches2[j] || s1[i] !== s2[j]) continue;
      matches1[i] = true;
      matches2[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix scale (up to 4 common initial chars)
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(len1, len2));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Normalize string: lowercase, trimmed, collapsed whitespace.
 */
export function normalizeStr(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Remove non-alphanumeric characters for slug comparison.
 */
export function slugifyStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface MatchScore {
  score: number;
  matchType: "exact" | "slug" | "prefix" | "word-prefix" | "substring" | "fuzzy";
  isCloseMatch: boolean;
}

/**
 * Score how well `query` matches `target` (e.g. district name).
 * Higher score = better match.
 * Returns score <= 0 if target should be filtered out.
 */
export function scoreMatch(query: string, target: string): MatchScore {
  const q = normalizeStr(query);
  const t = normalizeStr(target);

  if (!q) return { score: 0, matchType: "exact", isCloseMatch: true };
  if (!t) return { score: 0, matchType: "exact", isCloseMatch: false };

  // 1. Exact match
  if (t === q) {
    return { score: 1000, matchType: "exact", isCloseMatch: true };
  }

  // 2. Slug match (ignoring spaces, hyphens, etc. like "Gandhi Nagar" vs "Gandhinagar")
  const qSlug = slugifyStr(q);
  const tSlug = slugifyStr(t);
  if (tSlug === qSlug && qSlug.length > 0) {
    return { score: 950, matchType: "slug", isCloseMatch: true };
  }

  // 3. Exact prefix match
  if (t.startsWith(q)) {
    const penalty = Math.min(100, (t.length - q.length) * 2);
    return { score: 900 - penalty, matchType: "prefix", isCloseMatch: true };
  }

  // 4. Slug prefix match
  if (qSlug.length >= 2 && tSlug.startsWith(qSlug)) {
    const penalty = Math.min(100, (tSlug.length - qSlug.length) * 2);
    return { score: 850 - penalty, matchType: "prefix", isCloseMatch: true };
  }

  // 5. Word-level prefix match (e.g. "Nicobar" matching "Andaman & Nicobar")
  const targetWords = t.split(/[\s\-&/,]+/).filter(Boolean);
  const wordPrefix = targetWords.some((w) => w.startsWith(q));
  if (wordPrefix) {
    return { score: 800 - Math.min(50, t.length - q.length), matchType: "word-prefix", isCloseMatch: true };
  }

  // 6. Substring match
  if (t.includes(q)) {
    return { score: 700 - Math.min(100, t.length - q.length), matchType: "substring", isCloseMatch: true };
  }
  if (qSlug.length >= 3 && tSlug.includes(qSlug)) {
    return { score: 650 - Math.min(100, tSlug.length - qSlug.length), matchType: "substring", isCloseMatch: true };
  }

  // 7. Fuzzy distance calculation
  const dist = damerauLevenshtein(q, t);
  const jw = jaroWinkler(q, t);

  // Check word-level distance for multi-word districts
  let bestWordDist = dist;
  let bestWordJw = jw;
  for (const w of targetWords) {
    const wd = damerauLevenshtein(q, w);
    const wjw = jaroWinkler(q, w);
    if (wd < bestWordDist) bestWordDist = wd;
    if (wjw > bestWordJw) bestWordJw = wjw;
  }

  const effectiveDist = Math.min(dist, bestWordDist);
  const effectiveJw = Math.max(jw, bestWordJw);

  // Check prefix distance: if query is a prefix with minor typo
  if (t.length > q.length) {
    const tPrefix = t.slice(0, q.length + 1);
    const prefixDist = damerauLevenshtein(q, tPrefix);
    if (prefixDist < effectiveDist) {
      const prefixJw = jaroWinkler(q, tPrefix);
      if (prefixDist <= 1 && q.length >= 3 && prefixJw >= 0.8) {
        return { score: 550 - prefixDist * 50, matchType: "fuzzy", isCloseMatch: true };
      }
    }
  }

  // Strict thresholds to avoid false positives on short words:
  if (q.length <= 2) {
    return { score: 0, matchType: "fuzzy", isCloseMatch: false };
  }

  if (q.length === 3) {
    if (effectiveDist <= 1 && effectiveJw >= 0.8) {
      return { score: 400 + effectiveJw * 100, matchType: "fuzzy", isCloseMatch: true };
    }
    return { score: 0, matchType: "fuzzy", isCloseMatch: false };
  }

  // For 4+ characters:
  const maxLen = Math.max(q.length, t.length);
  const isAcceptableFuzzy =
    (effectiveDist <= 1 && effectiveJw >= 0.72) ||
    (effectiveDist <= 2 && q.length >= 5 && effectiveJw >= 0.75) ||
    (effectiveDist <= 3 && q.length >= 8 && effectiveJw >= 0.82) ||
    (effectiveJw >= 0.84);

  if (isAcceptableFuzzy) {
    const score = Math.round(effectiveJw * 450 + (1 - effectiveDist / maxLen) * 150);
    return { score, matchType: "fuzzy", isCloseMatch: true };
  }

  return { score: 0, matchType: "fuzzy", isCloseMatch: false };
}

/**
 * Filter and rank an array of items using fuzzy search.
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string | string[],
  minScore = 1
): T[] {
  const q = query.trim();
  if (!q) return items;

  const scoredItems: { item: T; score: number }[] = [];

  for (const item of items) {
    const rawTexts = getText(item);
    const texts = Array.isArray(rawTexts) ? rawTexts : [rawTexts];

    let maxScore = 0;
    for (const text of texts) {
      if (!text) continue;
      const res = scoreMatch(q, text);
      if (res.score > maxScore) {
        maxScore = res.score;
      }
    }

    if (maxScore >= minScore) {
      scoredItems.push({ item, score: maxScore });
    }
  }

  scoredItems.sort((a, b) => b.score - a.score);
  return scoredItems.map((s) => s.item);
}
