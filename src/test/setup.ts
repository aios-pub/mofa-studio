/**
 * Vitest global setup: matchers for DOM assertions and a clean fetch mock.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, vi } from "vitest";
import i18n from "../i18n";

// Tests assert against the Chinese UI; keep i18next on zh-CN regardless of
// the jsdom navigator language. Set synchronously at module scope — inside
// beforeAll it loses the race against the first component render.
(i18n as unknown as { language: string }).language = "zh-CN";
// Prevent the LanguageDetector from overriding our forced zh-CN.
// The detector checks localStorage first, so pre-populate it.
localStorage.setItem("mofa-studio-language", "zh-CN");

// Test-isolation guard: a late poll timer can fire after teardown and call
// window.dispatchEvent while jsdom is partially torn down, which crashes the
// whole worker ("parameter 1 is not of type 'Event'") and kills the
// remaining tests in the file. Swallow those stray non-Event dispatches.
const __origDispatch = window.dispatchEvent.bind(window);
window.dispatchEvent = ((e: unknown) => {
  if (!(e instanceof Event)) {
    console.warn("[setup] ignored non-Event dispatch:", e);
    return false;
  }
  return __origDispatch(e as Event);
}) as typeof window.dispatchEvent;

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
  // Force navigator.language to zh-CN so i18next's LanguageDetector picks zh-CN
  // instead of en-US (which would override our explicit language setting).
  Object.defineProperty(navigator, "language", {
    writable: true,
    value: "zh-CN",
    configurable: true,
  });
  Object.defineProperty(navigator, "languages", {
    writable: true,
    value: ["zh-CN", "zh", "en-US"],
    configurable: true,
  });
  // Re-lock language after LanguageDetector may have run and switched to en-US.
  void i18n.changeLanguage("zh-CN");
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
  // Workers are reused across test files; leftover localStorage (installed
  // skills, saved commands, history) would flip later files' UI states.
  localStorage.clear();
  sessionStorage.clear();
  // Re-lock language to zh-CN after localStorage is cleared, since the
  // LanguageDetector reads from localStorage and would otherwise fall back
  // to navigator (en-US in jsdom).
  void i18n.changeLanguage("zh-CN");
});
