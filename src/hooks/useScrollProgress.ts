/**
 * 滚动进度 Hook
 * 用于获取页面或容器的滚动进度
 */

import { useScroll, type MotionValue } from "framer-motion";
import { useMemo, useRef } from "react";

export type UseScrollProgressTarget = "document" | "container";

export interface UseScrollProgressReturn {
  /** 水平滚动进度值 (0-1) */
  scrollXProgress: MotionValue<number>;
  /** 垂直滚动进度值 (0-1) */
  scrollYProgress: MotionValue<number>;
  /** 容器元素的引用，用于容器滚动模式 */
  elementRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Custom Hook，用于获取滚动进度
 *
 * @param target - 滚动目标类型，Optional值为 "document" 或 "container"，默认为 "document"
 * @returns 返回包含滚动进度值和元素引用的对象
 *
 * @example
 * // 监听整个Document的滚动
 * const { scrollYProgress } = useScrollProgress();
 *
 * @example
 * // 监听容器的滚动
 * const { scrollYProgress, elementRef } = useScrollProgress("container");
 * // 将 elementRef 绑定到容器元素
 */
export function useScrollProgress(
  target: UseScrollProgressTarget = "document",
): UseScrollProgressReturn {
  const elementRef = useRef<HTMLDivElement>(null);

  const options =
    target === "container" ? { container: elementRef } : undefined;

  const { scrollYProgress, scrollXProgress } = useScroll(options);

  const memoizedValue = useMemo(
    () => ({ elementRef, scrollXProgress, scrollYProgress }),
    [scrollXProgress, scrollYProgress],
  );

  return memoizedValue;
}

export default useScrollProgress;
