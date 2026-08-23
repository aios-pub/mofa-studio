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
