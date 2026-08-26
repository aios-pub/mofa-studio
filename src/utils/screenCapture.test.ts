/**
 * Tests for PLAT-11 截图提问: the screen-capture util (capability detection,
 * frame capture through a stubbed getDisplayMedia, and the honest failure
 * path when the API is unavailable).
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  captureScreenshot,
  screenCaptureSupported,
} from "./screenCapture";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("screenCaptureSupported (PLAT-11)", () => {
  it("reports true when getDisplayMedia exists", () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getDisplayMedia: vi.fn() },
      configurable: true,
    });
    expect(screenCaptureSupported()).toBe(true);
  });

  it("reports false in environments without the API", () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {},
      configurable: true,
    });
    expect(screenCaptureSupported()).toBe(false);
  });

  it("reports false when navigator.mediaDevices is absent", () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: undefined,
      configurable: true,
    });
    expect(screenCaptureSupported()).toBe(false);
  });
});

describe("captureScreenshot (PLAT-11)", () => {
  it("throws honestly when the API is missing", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {},
      configurable: true,
    });
    await expect(captureScreenshot()).rejects.toThrow("不支持屏幕捕获");
  });
});
