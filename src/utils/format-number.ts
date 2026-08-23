/**
 * Number formatting utilities
 */

type InputValue = string | number | null | undefined;

/**
 * Convert input to a number
 */
function toNumber(value: InputValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

/**
 * Format number (with thousands separator)
 * @param value Number or string
 * @param options Intl.NumberFormat options
 * @returns Formatted string
 */
export function fNumber(
  value: InputValue,
  options?: Omit<Intl.NumberFormatOptions, "style">,
): string {
  const num = toNumber(value);
  if (num === null) return "";

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
    ...options,
  }).format(num);
}

/**
 * Format currency
 * @param value Number or string
 * @param currency Currency code, defaults to CNY
 * @returns Formatted string
 */
export function fCurrency(value: InputValue, currency: string = "CNY"): string {
  const num = toNumber(value);
  if (num === null) return "";

  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format percentage
 * @param value Number or string (raw value, not a percentage)
 * @param decimals Decimal places
 * @returns Formatted string
 */
export function fPercent(value: InputValue, decimals: number = 1): string {
  const num = toNumber(value);
  if (num === null) return "";

  return new Intl.NumberFormat("zh-CN", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Abbreviate numbers (e.g. 1K, 1M, 1B)
 * @param value Number or string
 * @param decimals Decimal places
 * @returns Formatted string
 */
export function fShortenNumber(
  value: InputValue,
  decimals: number = 1,
): string {
  const num = toNumber(value);
  if (num === null) return "";

  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absNum >= 1e9) {
    return sign + (absNum / 1e9).toFixed(decimals).replace(/\.0$/, "") + "B";
  }
  if (absNum >= 1e6) {
    return sign + (absNum / 1e6).toFixed(decimals).replace(/\.0$/, "") + "M";
  }
  if (absNum >= 1e3) {
    return sign + (absNum / 1e3).toFixed(decimals).replace(/\.0$/, "") + "K";
  }
  return sign + absNum.toFixed(decimals).replace(/\.0$/, "");
}

/**
 * Format bytes
 * @param value Number of bytes
 * @param decimals Decimal places
 * @returns Formatted string
 */
export function fBytes(value: InputValue, decimals: number = 1): string {
  const num = toNumber(value);
  if (num === null) return "";

  if (num === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(Math.abs(num)) / Math.log(k));

  const index = Math.min(i, sizes.length - 1);
  const size = (num / Math.pow(k, index)).toFixed(decimals);

  // Remove trailing zeros
  const trimmedSize = size.replace(/\.?0+$/, "");

  return `${trimmedSize} ${sizes[index]}`;
}

/**
 * Format file size (alias of fBytes)
 */
export const fFileSize = fBytes;

/**
 * Format as compact number (for charts, etc.)
 * @param value Number
 * @returns Compact format string
 */
export function fCompactNumber(value: InputValue): string {
  const num = toNumber(value);
  if (num === null) return "";

  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(num);
}

/**
 * Format ratio
 * @param numerator Numerator
 * @param denominator Denominator
 * @param decimals Decimal places
 * @returns Formatted ratio string
 */
export function fRatio(
  numerator: InputValue,
  denominator: InputValue,
  decimals: number = 2,
): string {
  const num = toNumber(numerator);
  const den = toNumber(denominator);

  if (num === null || den === null || den === 0) {
    return "0";
  }

  return (num / den).toFixed(decimals).replace(/\.?0+$/, "");
}

export default {
  fNumber,
  fCurrency,
  fPercent,
  fShortenNumber,
  fBytes,
  fFileSize,
  fCompactNumber,
  fRatio,
};
