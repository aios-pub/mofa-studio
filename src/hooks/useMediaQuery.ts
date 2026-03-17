/**
 * 媒体查询 Hook
 * 支持 SSR 安全的媒体查询
 */

import { useState, useEffect } from "react";

export type MediaQueryValues = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isDarkMode: boolean;
  isLightMode: boolean;
  isReducedMotion: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isTouchDevice: boolean;
  isHighDPI: boolean;
};

/**
 * 基础媒体查询 Hook
 * @param query 媒体查询字符串
 * @returns 是否匹配
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // SSR 检查
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);

    // 初始值
    setMatches(mediaQuery.matches);

    // 监听变化
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

/**
 * 断点尺寸
 */
export const breakpoints = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  "2xl": 1400,
} as const;

/**
 * 断点向上检测
 * @param breakpoint 断点尺寸
 * @returns 是否大于等于该断点
 */
export function useBreakpointUp(breakpoint: number): boolean {
  return useMediaQuery(`(min-width: ${breakpoint}px)`);
}

/**
 * 断点向下检测
 * @param breakpoint 断点尺寸
 * @returns 是否小于该断点
 */
export function useBreakpointDown(breakpoint: number): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}

/**
 * 断点之间检测
 * @param minBreakpoint 最小断点
 * @param maxBreakpoint 最大断点
 * @returns 是否在两个断点之间
 */
export function useBreakpointBetween(
  minBreakpoint: number,
  maxBreakpoint: number,
): boolean {
  return useMediaQuery(
    `(min-width: ${minBreakpoint}px) and (max-width: ${maxBreakpoint - 1}px)`,
  );
}

/**
 * 完整的媒体查询 Hook
 * 返回所有媒体查询状态
 */
export function useMediaQueries(): MediaQueryValues {
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.md - 1}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  );
  const isDesktop = useMediaQuery(`(min-width: ${breakpoints.lg}px)`);
  const isLargeDesktop = useMediaQuery(`(min-width: ${breakpoints.xl}px)`);

  const isDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const isLightMode = useMediaQuery("(prefers-color-scheme: light)");
  const isReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isPortrait = useMediaQuery("(orientation: portrait)");
  const isLandscape = useMediaQuery("(orientation: landscape)");

  // 触摸设备检测
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkTouch = () => {
      setIsTouchDevice(
        "ontouchstart" in window || navigator.maxTouchPoints > 0,
      );
    };

    checkTouch();
    window.addEventListener("touchstart", checkTouch, { once: true });

    return () => {
      window.removeEventListener("touchstart", checkTouch);
    };
  }, []);

  // 高 DPI 检测
  const [isHighDPI, setIsHighDPI] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsHighDPI(window.devicePixelRatio > 1);

    const handler = () => {
      setIsHighDPI(window.devicePixelRatio > 1);
    };

    window.addEventListener("resize", handler);

    return () => {
      window.removeEventListener("resize", handler);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isDarkMode,
    isLightMode,
    isReducedMotion,
    isPortrait,
    isLandscape,
    isTouchDevice,
    isHighDPI,
  };
}

/**
 * 移动端检测 Hook
 * @returns 是否为移动端
 */
export function useIsMobile(): boolean {
  return useBreakpointDown(breakpoints.md);
}

/**
 * 桌面端检测 Hook
 * @returns 是否为桌面端
 */
export function useIsDesktop(): boolean {
  return useBreakpointUp(breakpoints.lg);
}

/**
 * 暗黑模式偏好检测 Hook
 * @returns 系统是否偏好暗黑模式
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

/**
 * 减少动画偏好检测 Hook
 * @returns 系统是否偏好减少动画
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * 设备方向检测 Hook
 * @returns 设备方向
 */
export function useOrientation(): "portrait" | "landscape" {
  const isPortrait = useMediaQuery("(orientation: portrait)");
  return isPortrait ? "portrait" : "landscape";
}

export default useMediaQuery;
