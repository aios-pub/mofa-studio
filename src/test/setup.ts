/**
 * Vitest global setup: matchers for DOM assertions and a clean fetch mock.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, vi } from "vitest";

beforeAll(() => {
  // jsdom lacks the browser APIs antd touches at render time.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // Direct assignment (not vi.stubGlobal) so afterEach's unstubAllGlobals
  // keeps the polyfill in place for every test.
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
