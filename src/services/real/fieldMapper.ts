/**
 * Generic field mapping utilities
 * For converting between snake_case (backend) and camelCase (frontend)
 */

/** Safely parse date strings or Date objects returned by the backend */
export function parseDate(value: string | number | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  // If already a Date object, return directly
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    // chrono::NaiveDateTime may output "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DD HH:MM:SS"
    const d = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/** camelCase → snake_case */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** snake_case → camelCase */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** Recursively convert all keys of an object */
export function convertKeys(obj: unknown, converter: (key: string) => string): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => convertKeys(v, converter));
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[converter(key)] = convertKeys(value, converter);
  }
  return result;
}

/** Backend snake_case response -> frontend camelCase */
export function mapToCamel<T>(obj: unknown): T {
  return convertKeys(obj, toCamelCase) as T;
}

/** Frontend camelCase -> backend snake_case */
export function mapToSnake<T>(obj: unknown): T {
  return convertKeys(obj, toSnakeCase) as T;
}
