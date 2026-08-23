/**
 * 滚动Progress bar组件
 * 显示页面滚动进度，提升阅读体验
 */

import { useSpring, motion, type MotionValue } from "framer-motion";
import type { CSSProperties } from "react";

export interface ScrollProgressProps {
  /** Progress bar颜色 */
  color?: string;
  /** 滚动进度值 (0-1) */
  scrollYProgress: MotionValue<number>;
  /** Progress bar高度 */
  height?: number;
  /** Custom类名 */
  className?: string;
}

/**
 * 滚动Progress bar组件
 *
 * 使用 Framer Motion 的 spring 动画实现平滑过渡
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
  // 使用 spring 动画使Progress bar变化更平滑
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // 设置Progress bar颜色，默认使用Theme色
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
