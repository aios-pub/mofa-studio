import { useTranslation } from "react-i18next";
/**
 * Resizable sidebar component
 * Supports mouse drag resizing with min/max width limits
 * Auto-collapses when dragged to the minimum size
 * Persists width to localStorage
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { RightOutlined, LeftOutlined } from "@ant-design/icons";

interface ResizableSidebarProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  collapseThreshold?: number;
  collapsedWidth?: number;
  storageKey?: string;
}

function getStoredWidth(key: string | undefined, defaultWidth: number): number {
  if (!key) return defaultWidth;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.width === "number") {
        return parsed.width;
      }
    }
  } catch {
    // ignore
  }
  return defaultWidth;
}

function getStoredCollapsed(key: string | undefined): boolean {
  if (!key) return false;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.collapsed === "boolean") {
        return parsed.collapsed;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

function storeState(
  key: string | undefined,
  width: number,
  collapsed: boolean,
) {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify({ width, collapsed }));
  } catch {
    // ignore
  }
}

export default function ResizableSidebar({
  children,
  defaultWidth = 320,
  minWidth = 80,
  maxWidth = 500,
  className = "",
  style,
  collapseThreshold = 20,
  collapsedWidth = 40,
  storageKey,
}: ResizableSidebarProps) {  const { t } = useTranslation();

  const storedWidth = getStoredWidth(storageKey, defaultWidth);
  const storedCollapsed = getStoredCollapsed(storageKey);

  const [width, setWidth] = useState(storedWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [collapsed, setCollapsed] = useState(storedCollapsed);
  const [showCollapseBtn, setShowCollapseBtn] = useState(false);

  // Keep the latest value in a ref to avoid stale closures in listeners
  const widthRef = useRef(width);
  const collapsedRef = useRef(collapsed);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const preCollapseWidthRef = useRef(storedCollapsed ? storedWidth : defaultWidth);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { widthRef.current = width; }, [width]);
  useEffect(() => { collapsedRef.current = collapsed; }, [collapsed]);

  // Persistent state
  useEffect(() => {
    storeState(storageKey, width, collapsed);
  }, [storageKey, width, collapsed]);

  // Dragging logic
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.max(0, Math.min(maxWidth, startWidthRef.current + deltaX));
      setWidth(newWidth);
      if (collapsedRef.current && newWidth > collapsedWidth + collapseThreshold) {
        setCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      const currentWidth = widthRef.current;
      if (currentWidth < minWidth + collapseThreshold) {
        preCollapseWidthRef.current = Math.max(minWidth, currentWidth);
        setCollapsed(true);
        setWidth(collapsedWidth);
      } else {
        setWidth(Math.max(minWidth, currentWidth));
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, collapseThreshold, collapsedWidth]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startWidthRef.current = collapsedRef.current ? collapsedWidth : widthRef.current;
      setIsResizing(true);
      if (collapsedRef.current) {
        setCollapsed(false);
        setWidth(minWidth);
      }
    },
    [minWidth, collapsedWidth],
  );

  const handleToggle = useCallback(() => {
    if (collapsedRef.current) {
      setCollapsed(false);
      setWidth(preCollapseWidthRef.current);
    } else {
      preCollapseWidthRef.current = Math.max(minWidth, widthRef.current);
      setCollapsed(true);
      setWidth(collapsedWidth);
    }
  }, [minWidth, collapsedWidth]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col ${className}`}
      style={{
        width: collapsed ? collapsedWidth : Math.max(minWidth, width),
        transition: isResizing ? "none" : "width 200ms ease",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={() => setShowCollapseBtn(true)}
      onMouseLeave={() => setShowCollapseBtn(false)}
    >
      {/* Content area */}
      <div
        className="flex flex-col h-full"
        style={{
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : undefined,
          transition: "opacity 150ms ease",
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      {/* Expand button in collapsed state - z-index above drag handle to stay clickable */}
      {collapsed && (
        <button
          onClick={handleToggle}
          className="absolute inset-0 flex flex-col items-center pt-3 text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors z-30 cursor-pointer bg-transparent border-none outline-none"
          title={t("展开面板")}
        >
          <RightOutlined className="text-xs mb-1" />
          <span
            className="text-[10px] whitespace-nowrap tracking-widest"
            style={{ writingMode: "vertical-rl" }}
          >
            展开
          </span>
        </button>
      )}

      {/* Drag handle - z-index below expand button when collapsed */}
      <div
        className="absolute top-0 right-0 h-full z-20 select-none"
        style={{
          width: collapsed ? 8 : 6,
          cursor: collapsed ? "pointer" : "col-resize",
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleToggle}
        title={collapsed ? "点击展开" : "拖拽调整宽度，双击折叠"}
      >
        {!collapsed && (
          <div
            className="absolute top-1/2 right-0 -translate-y-1/2 w-[2px] h-10 rounded-full"
            style={{
              backgroundColor: isResizing
                ? "var(--color-primary)"
                : "transparent",
            }}
          />
        )}
      </div>

      {/* Collapse button */}
      {!collapsed && showCollapseBtn && !isResizing && (
        <button
          onClick={handleToggle}
          className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full border border-(--color-border) bg-[var(--color-bg-base)] hover:bg-[var(--color-bg-secondary)] flex items-center justify-center z-30 cursor-pointer shadow-sm"
          title={t("折叠面板")}
        >
          <LeftOutlined className="text-[10px] text-[var(--color-text-tertiary)]" />
        </button>
      )}
    </div>
  );
}
