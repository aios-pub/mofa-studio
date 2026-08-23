/**
 * 模糊搜索工具
 * 支持Substring match和字符级模糊匹配
 */

/**
 * 模糊匹配：判断 text 是否匹配 query
 * 支持两种匹配方式：
 * 1. Substring match（不区分大小写）
 * 2. Character order match（query 中的字符按顺序出现在 text 中）
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
