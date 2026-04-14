/**
 * 通用字段映射工具
 * 用于 snake_case (后端) ↔ camelCase (前端) 之间的转换
 */

/** 安全解析后端返回的日期字符串 */
export function parseDate(value: string | number | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') return new Date(value);
  // chrono::NaiveDateTime 可能输出 "YYYY-MM-DDTHH:MM:SS" 或 "YYYY-MM-DD HH:MM:SS"
  const d = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  return isNaN(d.getTime()) ? undefined : d;
}

/** camelCase → snake_case */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** snake_case → camelCase */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** 递归转换对象所有 key */
export function convertKeys(obj: unknown, converter: (key: string) => string): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => convertKeys(v, converter));
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[converter(key)] = convertKeys(value, converter);
  }
  return result;
}

/** 后端 snake_case 响应 → 前端 camelCase */
export function mapToCamel<T>(obj: unknown): T {
  return convertKeys(obj, toCamelCase) as T;
}

/** 前端 camelCase → 后端 snake_case */
export function mapToSnake<T>(obj: unknown): T {
  return convertKeys(obj, toSnakeCase) as T;
}
