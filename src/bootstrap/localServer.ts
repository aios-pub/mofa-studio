/**
 * Embedded local-server bootstrap.
 *
 * Before the React tree mounts (Tauri main window only), ask the Rust shell
 * where the embedded server-core is listening, point the service layer at
 * it, wait for readiness, and establish the silent local session. This is
 * what turns the app local-first inside the Tauri shell while browser dev
 * keeps using the configured remote backend.
 */

import { invoke } from "@tauri-apps/api/core";
import { isTauriApp } from "@/utils/tauri";
import { setEmbeddedServer } from "@/config";
import { ensureLocalSession } from "@/services/localAuth";

/** Address payload returned by the `get_server_info` Tauri command. */
interface ServerInfo {
  base_url: string;
  port: number;
  version: string;
}

/** LocalStorage key used by the WebSocket manager for its adapter mode. */
const WS_MODE_KEY = "mofa-studio-ws-mode";

/**
 * Initialize the embedded server connection. Safe to call in any
 * environment; no-op outside the Tauri shell. Never rejects — the app must
 * still boot if the embedded server is unavailable.
 */
export async function initLocalServer(): Promise<void> {
  if (!isTauriApp()) {
    return;
  }

  try {
    const info = await invoke<ServerInfo>("get_server_info");
    if (!info?.base_url) {
      throw new Error("get_server_info returned no base URL");
    }

    setEmbeddedServer(info.base_url);
    preferNativeWebSocket();
    await waitForHealth(info.base_url, 5_000);
    await ensureLocalSession();
  } catch (error) {
    console.error("[localServer] Embedded server bootstrap failed:", error);
  }
}

/**
 * The embedded backend speaks plain WebSocket (no socket.io server), so
 * default the adapter mode accordingly unless the user chose one.
 */
function preferNativeWebSocket(): void {
  if (!localStorage.getItem(WS_MODE_KEY)) {
    localStorage.setItem(WS_MODE_KEY, "native");
  }
}

/** Poll /health until the embedded server answers or the timeout expires. */
async function waitForHealth(
  baseURL: string,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/health`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Server not accepting connections yet — retry after a short pause
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Embedded server not healthy after ${timeoutMs}ms`);
}
