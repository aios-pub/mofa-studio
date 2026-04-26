/**
 * 可调整宽度的侧边栏组件
 * 支持鼠标拖拽调整宽度，带最小/最大宽度限制
 * 支持拖拽到最小尺寸后自动折叠
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
}

export default function ResizableSidebar({
  children,
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 500,
  className = "",
  style,
  collapseThreshold = 60,
  collapsedWidth = 40,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showCollapseBtn, setShowCollapseBtn] = useState(false);

  // 用 ref 保存最新值，避免事件监听器闭包捕获旧值
  const widthRef = useRef(width);
  const collapsedRef = useRef(collapsed);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { widthRef.current = width; }, [width]);
  useEffect(() => { collapsedRef.current = collapsed; }, [collapsed]);

  // 拖拽逻辑
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(0, Math.min(maxWidth, e.clientX));
      setWidth(newWidth);
      if (collapsedRef.current && newWidth > collapsedWidth + collapseThreshold) {
        setCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      const currentWidth = widthRef.current;
      if (currentWidth < minWidth + collapseThreshold) {
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
      setIsResizing(true);
      if (collapsedRef.current) {
        setCollapsed(false);
        setWidth(minWidth);
      }
    },
    [minWidth],
  );

  const handleToggle = useCallback(() => {
    if (collapsedRef.current) {
      setCollapsed(false);
      setWidth(defaultWidth);
    } else {
      setCollapsed(true);
      setWidth(collapsedWidth);
    }
  }, [defaultWidth, collapsedWidth]);

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
      {/* 内容区域 */}
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

      {/* 折叠状态下的展开按钮 — z-index 高于拖拽手柄确保可点击 */}
      {collapsed && (
        <button
          onClick={handleToggle}
          className="absolute inset-0 flex flex-col items-center pt-3 text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors z-30 cursor-pointer bg-transparent border-none outline-none"
          title="展开面板"
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

      {/* 拖拽手柄 — 折叠时 z-index 低于展开按钮 */}
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

      {/* 折叠按钮 */}
      {!collapsed && showCollapseBtn && !isResizing && (
        <button
          onClick={handleToggle}
          className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full border border-(--color-border) bg-[var(--color-bg-base)] hover:bg-[var(--color-bg-secondary)] flex items-center justify-center z-30 cursor-pointer shadow-sm"
          title="折叠面板"
        >
          <LeftOutlined className="text-[10px] text-[var(--color-text-tertiary)]" />
        </button>
      )}
    </div>
  );
}
