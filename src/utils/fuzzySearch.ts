/**
 * Fuzzy search utilities
 * Supports substring match and character-level fuzzy matching
 */

/**
 * Fuzzy match: whether text matches query
 * Supports two matching modes:
 * 1. Substring match (case-insensitive)
 * 2. Character order match (characters of query appear in order within text)
 */
export function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  // Substring match
  if (t.includes(q)) return true;
  // Character order match
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}
