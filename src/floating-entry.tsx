import React from "react";
import ReactDOM from "react-dom/client";
import FloatingApp from "./floating/FloatingApp";

// Diagnose Tauri API
console.log("[floating-entry] Checking Tauri environment...");
console.log("[floating-entry] window.__TAURI__:", !!(window as unknown as { __TAURI__?: unknown }).__TAURI__);
console.log("[floating-entry] window.__TAURI_INTERNALS__:", !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
console.log("[floating-entry] User Agent:", navigator.userAgent);

// Floating window entry - Does not load any global styles
document.documentElement.classList.add("floating-html");
document.body.classList.add("floating-body");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FloatingApp />
  </React.StrictMode>,
);
