/**
 * Scroll progress bar component
 * Show page scroll progress to improve reading experience
 */

import { useSpring, motion, type MotionValue } from "framer-motion";
import type { CSSProperties } from "react";

export interface ScrollProgressProps {
  /** Progress bar color */
  color?: string;
  /** Scroll progress value (0-1) */
  scrollYProgress: MotionValue<number>;
  /** Progress bar height */
  height?: number;
  /** Custom class name */
  className?: string;
}

/**
 * Scroll progress bar component
 *
 * Use Framer Motion spring animations for smooth transitions
 *
 * @example
 * ```tsx
 * const { scrollYProgress } = useScrollProgress();
 * <ScrollProgress scrollYProgress={scrollYProgress} />
 * ```
 */
export function ScrollProgress({
  scrollYProgress,
  height = 3,
  color,
  className,
}: ScrollProgressProps) {
  // Use spring animation for smoother progress bar changes
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Set progress bar color, defaults to theme color
  const backgroundColor = color || "var(--color-primary)";

  const style: CSSProperties = {
    transformOrigin: "0%",
    height,
    backgroundColor,
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  };

  return <motion.div style={{ scaleX, ...style }} className={className} />;
}

export default ScrollProgress;
