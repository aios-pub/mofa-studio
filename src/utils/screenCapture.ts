/**
 * PLAT-11 截图提问: capture the screen (or a window/region the user
 * picks in the browser's native picker) as a single frame and hand it to
 * the chat as a vision attachment — the existing CHAT-04 vlm chain does
 * the rest.
 *
 * Uses `navigator.mediaDevices.getDisplayMedia()` (the standard web screen
 * capture API, available in Tauri's WebKit/WebView2) — no native Rust
 * dependency needed. The stream closes after one frame is grabbed.
 */

export interface CapturedFrame {
  /** data:image/png;base64,… ready for <img src> or attachment url. */
  dataUrl: string;
  /** Pixel dimensions of the captured frame. */
  width: number;
  height: number;
}

/** Whether the browser/webview supports screen capture at all. */
export function screenCaptureSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function"
  );
}

/**
 * Prompt the user to pick a screen/window/tab, then grab one frame from
 * the live stream. The stream is stopped immediately after the capture.
 */
export async function captureScreenshot(): Promise<CapturedFrame | null> {
  if (!screenCaptureSupported()) {
    throw new Error("当前环境不支持屏幕捕获");
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 1 },
    audio: false,
  });

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;

    // Wait for the video to be ready enough to draw a frame.
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("屏幕捕获流无法加载"));
      // Safety timeout: don't hang if the stream stalls.
      setTimeout(() => reject(new Error("屏幕捕获超时")), 5000);
    });

    await video.play();

    // Small delay so the first real frame is painted.
    await new Promise((r) => setTimeout(r, 100));

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法创建画布上下文");
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");
    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    // Always stop the stream, even on errors.
    stream.getTracks().forEach((track) => track.stop());
  }
}
