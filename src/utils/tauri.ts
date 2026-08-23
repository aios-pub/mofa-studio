import { invoke } from "@tauri-apps/api/core";

export const isTauriApp = () => {
  if (typeof window === "undefined") {
    return false;
  }

  // Tauri v2 uses __TAURI_INTERNALS__
  return "__TAURI__" in window || "__TAURI_INTERNALS__" in window;
};

/**
 * Get floating ball mode configuration from the Rust side
 */
export async function getFloatingMode(): Promise<"floating" | "window"> {
  if (!isTauriApp()) {
    // Use environment variables in non-Tauri environments
    return import.meta.env.VITE_FLOATING_MODE || "floating";
  }

  try {
    const mode = await invoke<string>("get_floating_mode");
    return mode as "floating" | "window";
  } catch {
    return import.meta.env.VITE_FLOATING_MODE || "floating";
  }
}
