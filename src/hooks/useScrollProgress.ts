/**
 * Scroll progress hook
 * For getting page or container scroll progress
 */

import { useScroll, type MotionValue } from "framer-motion";
import { useMemo, useRef } from "react";

export type UseScrollProgressTarget = "document" | "container";

export interface UseScrollProgressReturn {
  /** Horizontal scroll progress (0-1) */
  scrollXProgress: MotionValue<number>;
  /** Vertical scroll progress (0-1) */
  scrollYProgress: MotionValue<number>;
  /** Container element ref for container scroll mode */
  elementRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Custom hook for scroll progress
 *
 * @param target - Scroll target type, either "document" or "container", defaults to "document"
 * @returns Object containing scroll progress value and element ref
 *
 * @example
 * // Listen to document scrolling
 * const { scrollYProgress } = useScrollProgress();
 *
 * @example
 * // Listen to container scrolling
 * const { scrollYProgress, elementRef } = useScrollProgress("container");
 * // Bind elementRef to the container element
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
