import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import FloatingApp from "./floating/FloatingApp";
import { isTauriApp } from "./utils/tauri";
import "./styles/globals.css";

const init = async () => {
  let RootApp: React.ReactNode;

  if (isTauriApp()) {
    const { Window } = await import("@tauri-apps/api/window");
    const label = Window.getCurrent().label;
    if (label === "floating") {
      RootApp = <FloatingApp />;
    } else {
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

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>{RootApp}</React.StrictMode>,
  );
};

void init();
