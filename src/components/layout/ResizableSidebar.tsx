/**
 * 可调整宽度的侧边栏组件
 * 支持鼠标拖拽调整宽度，带最小/最大宽度限制
 */

import { useState, useEffect, useCallback } from "react";

interface ResizableSidebarProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function ResizableSidebar({
  children,
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 500,
  className = "",
  style,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    },
    [],
  );

  return (
    <div
      className={`relative flex flex-col ${className}`}
      style={{
        width,
        transition: isResizing ? "none" : undefined,
        ...style,
      }}
    >
      {children}
      {/* 拖拽手柄 */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-20 hover:bg-[var(--color-primary)]/30 transition-colors"
        style={{
          backgroundColor: isResizing
            ? "var(--color-primary)"
            : "transparent",
          opacity: isResizing ? 0.5 : 1,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
