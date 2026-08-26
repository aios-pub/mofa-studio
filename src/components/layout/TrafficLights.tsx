/**
 * macOS-style traffic-light window controls, rendered inline as the first
 * flex child of the sidebar brand row so they always share the title line.
 *
 * Geometry uses inline styles deliberately: the cluster must not depend on
 * generated utility classes for its position. Buttons are inert outside
 * Tauri; drag surfaces around them come from the brand row (see
 * CustomTitlebar for the data-window-drag-region delegation).
 */

import { isTauriApp } from "../../utils/tauri";

const LIGHT_COLORS = {
  red: { bg: "#FF5F57", hover: "#E0443B", glyph: "✕" },
  yellow: { bg: "#FEBC2E", hover: "#D4A01F", glyph: "−" },
  green: { bg: "#28C840", hover: "#1BAB30", glyph: "⤢" },
} as const;

type LightColor = keyof typeof LIGHT_COLORS;

function Light({ color, onClick }: { color: LightColor; onClick: () => void }) {
  const c = LIGHT_COLORS[color];
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = c.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = c.bg;
      }}
      className="shrink-0 cursor-pointer rounded-full flex items-center justify-center pointer-events-auto focus:outline-none"
      style={{
        width: 12,
        height: 12,
        backgroundColor: c.bg,
        fontSize: 7,
        lineHeight: 1,
        padding: 0,
      }}
      aria-label={color}
    >
      {/* Glyphs reveal when hovering the cluster, like native macOS */}
      <span
        className="opacity-0 transition-opacity duration-100 group-hover/lights:opacity-100"
        style={{ color: "rgba(0,0,0,0.55)" }}
      >
        {c.glyph}
      </span>
    </button>
  );
}

export default function TrafficLights({ leftInset = 16 }: { leftInset?: number }) {
  if (!isTauriApp()) return null;

  const control = async (action: "close" | "minimize" | "maximize") => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      if (action === "close") await win.close();
      else if (action === "minimize") await win.minimize();
      else await win.toggleMaximize();
    } catch (err) {
      console.error("Window action failed:", err);
    }
  };

  return (
    <div
      className="group/lights flex items-center shrink-0 select-none"
      style={{ paddingLeft: leftInset, gap: 10 }}
    >
      <Light color="red" onClick={() => void control("close")} />
      <Light color="yellow" onClick={() => void control("minimize")} />
      <Light color="green" onClick={() => void control("maximize")} />
    </div>
  );
}
