import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { isTauriApp } from "./utils/tauri";
import { initLocalServer } from "./bootstrap/localServer";
import "./styles/globals.css";

// Main window entry - For main window only
const init = async () => {
  // Resolve the embedded local backend (and establish the silent local
  // session) before rendering, so the first API call targets it already
  await initLocalServer();

  let RootApp: React.ReactNode;

  if (isTauriApp()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();
      const label = appWindow.label;

      // Main window entry only handles main window
      if (label === "main") {
        // Rounded window shell (see globals.css) plus square-off tracking
        document.documentElement.classList.add("tauri-window");
        // Window-state tracking: resize events can arrive in bursts (and the
        // isMaximized/isFullscreen round-trips hop through the main thread),
        // so debounce and keep at most one query in flight — otherwise the
        // pending IPC queue grows without bound and starves the whole app.
        let shellQueryInFlight = false;
        let shellDebounce: ReturnType<typeof setTimeout> | undefined;
        const syncShellChrome = () => {
          if (shellQueryInFlight) return;
          shellQueryInFlight = true;
          void Promise.all([
            appWindow.isMaximized(),
            appWindow.isFullscreen(),
          ])
            .then(([maximized, fullscreen]) => {
              document.documentElement.classList.toggle(
                "window-maximized",
                maximized || fullscreen,
              );
            })
            .finally(() => {
              shellQueryInFlight = false;
            });
        };
        void appWindow.onResized(() => {
          clearTimeout(shellDebounce);
          shellDebounce = setTimeout(syncShellChrome, 150);
        });
        syncShellChrome();

        RootApp = (
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      } else {
        // If not main window accessing this entry, show blank
        RootApp = null;
      }
    } catch (error) {
      console.error("Failed to detect window type:", error);
      RootApp = (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
    }
  } else {
    RootApp = (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
  }

  if (RootApp) {
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>{RootApp}</React.StrictMode>,
    );
  }
};

void init();
