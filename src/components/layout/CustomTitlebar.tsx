/**
 * Frameless-window chrome helper for Tauri's decorations=false mode.
 *
 * The traffic lights themselves are the native macOS buttons (tao keeps
 * them on borderless windows); Rust positions them inside the top
 * --layout-header-height row (see position_traffic_lights in lib.rs).
 *
 * This component only owns the webview side of the chrome: elements marked
 * with `data-window-drag-region` start an interactive drag via the custom
 * `start_window_drag` command (which synthesizes its mouse event in Rust —
 * tao's built-in path reads NSApp.currentEvent and panics when it is nil).
 * Double-clicking a drag region toggles maximize.
 */

import { useEffect } from "react";
import { isTauriApp } from "../../utils/tauri";

interface CustomTitlebarProps {
  children?: React.ReactNode;
  className?: string;
}

export default function CustomTitlebar({ children, className = "" }: CustomTitlebarProps) {
  const isTauri = isTauriApp();

  // Delegate drag/maximize handling for every data-window-drag-region node,
  // so callers only need to place the attribute on inert areas.
  useEffect(() => {
    if (!isTauri) return;

    const inDragRegion = (e: MouseEvent) =>
      Boolean((e.target as HTMLElement | null)?.closest("[data-window-drag-region]"));

    const handleMouseDown = async (e: MouseEvent) => {
      if (e.button !== 0 || !inDragRegion(e)) return;
      e.preventDefault();
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("start_window_drag");
      } catch (err) {
        console.error("Window drag failed:", err);
      }
    };

    const handleDoubleClick = async (e: MouseEvent) => {
      if (!inDragRegion(e)) return;
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().toggleMaximize();
      } catch (err) {
        console.error("Toggle maximize failed:", err);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("dblclick", handleDoubleClick);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [isTauri]);

  if (!isTauri) {
    return <div className={className}>{children}</div>;
  }

  return <div className={`relative ${className}`}>{children}</div>;
}
