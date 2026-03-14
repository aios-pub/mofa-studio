import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { isTauriApp } from "./utils/tauri";
import "./styles/globals.css";

// 主窗口入口 - 仅用于 main 窗口
const init = async () => {
  let RootApp: React.ReactNode;

  if (isTauriApp()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();
      const label = appWindow.label;

      // 主窗口入口文件只处理 main 窗口
      if (label === "main") {
        RootApp = (
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      } else {
        // 如果不是 main 窗口访问了这个入口，显示空白
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
