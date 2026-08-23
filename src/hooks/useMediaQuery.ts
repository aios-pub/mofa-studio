/**
 * Media query hook
 * Supports SSR-safe media queries
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
 * Base media query hook
 * @param query Media query string
 * @returns Whether matched
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // SSR check
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);

    // Initial value
    setMatches(mediaQuery.matches);

    // Watch changes
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
 * Breakpoint sizes
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
 * Breakpoint and above detection
 * @param breakpoint Breakpoint size
 * @returns Whether greater than or equal to the breakpoint
 */
export function useBreakpointUp(breakpoint: number): boolean {
  return useMediaQuery(`(min-width: ${breakpoint}px)`);
}

/**
 * Breakpoint and below detection
 * @param breakpoint Breakpoint size
 * @returns Whether less than the breakpoint
 */
export function useBreakpointDown(breakpoint: number): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}

/**
 * Between breakpoints detection
 * @param minBreakpoint Minimum breakpoint
 * @param maxBreakpoint Maximum breakpoint
 * @returns Whether between two breakpoints
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
 * Full media query hook
 * Return all media query states
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

  // Touch device detection
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

  // High DPI detection
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
 * Mobile detection hook
 * @returns Whether mobile
 */
export function useIsMobile(): boolean {
  return useBreakpointDown(breakpoints.md);
}

/**
 * Desktop detection hook
 * @returns Whether desktop
 */
export function useIsDesktop(): boolean {
  return useBreakpointUp(breakpoints.lg);
}

/**
 * Dark mode preference hook
 * @returns Whether system prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

/**
 * Reduced motion preference hook
 * @returns Whether system prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Device orientation detection hook
 * @returns Device orientation
 */
export function useOrientation(): "portrait" | "landscape" {
  const isPortrait = useMediaQuery("(orientation: portrait)");
  return isPortrait ? "portrait" : "landscape";
}

export default useMediaQuery;
