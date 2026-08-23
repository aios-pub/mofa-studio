/**
 * 数字格式化工具
 */

type InputValue = string | number | null | undefined;

/**
 * 转换输入为数字
 */
function toNumber(value: InputValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

/**
 * 格式化数字（添加千分位）
 * @param value 数字或字符串
 * @param options Intl.NumberFormat 选项
 * @returns 格式化后的字符串
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
 * 格式化货币
 * @param value 数字或字符串
 * @param currency 货币代码，默认 CNY
 * @returns 格式化后的字符串
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
 * 格式化百分比
 * @param value 数字或字符串（原始值，非百分比）
 * @param decimals 小数位数
 * @returns 格式化后的字符串
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
 * 缩写数字（e.g. 1K, 1M, 1B）
 * @param value 数字或字符串
 * @param decimals 小数位数
 * @returns 格式化后的字符串
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
 * 格式化字节数
 * @param value 字节数
 * @param decimals 小数位数
 * @returns 格式化后的字符串
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

  // 移除尾部多余的零
  const trimmedSize = size.replace(/\.?0+$/, "");

  return `${trimmedSize} ${sizes[index]}`;
}

/**
 * 格式化File size（fBytes 的别名）
 */
export const fFileSize = fBytes;

/**
 * 格式化为紧凑数字（用于图表等场景）
 * @param value 数字
 * @returns 紧凑格式字符串
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
 * 格式化比率
 * @param numerator 分子
 * @param denominator 分母
 * @param decimals 小数位数
 * @returns 格式化后的比率字符串
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
