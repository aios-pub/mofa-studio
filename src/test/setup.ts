/**
 * Vitest global setup: matchers for DOM assertions and a clean fetch mock.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
