import { invoke } from "@tauri-apps/api/core";

export const isTauriApp = () => {
  if (typeof window === "undefined") {
    return false;
  }

  // Tauri v2 使用 __TAURI_INTERNALS__
  return "__TAURI__" in window || "__TAURI_INTERNALS__" in window;
};

/**
 * 从 Rust 端获取悬浮球模式配置
 */
export async function getFloatingMode(): Promise<"floating" | "window"> {
  if (!isTauriApp()) {
    // 非 Tauri 环境使用环境变量
    return import.meta.env.VITE_FLOATING_MODE || "floating";
  }

  try {
    const mode = await invoke<string>("get_floating_mode");
    return mode as "floating" | "window";
  } catch {
    return import.meta.env.VITE_FLOATING_MODE || "floating";
  }
}
