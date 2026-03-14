import { forwardRef } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import {
  LayoutGrid,
  Settings,
  Pin,
  PinOff,
  Power,
} from "lucide-react";

type ContextMenuProps = {
  placement: {
    horizontal: "left" | "right";
    vertical: "up" | "down";
  };
  alwaysOnTop: boolean;
  onOpenMain: () => void;
  onSettings: () => void;
  onToggleAlwaysOnTop: () => void;
  onExit: () => void;
  onClose: () => void;
};

const getContextMenuStyle = (placement: ContextMenuProps["placement"]): CSSProperties => ({
  position: "absolute" as const,
  left: placement.horizontal === "right" ? 0 : "auto",
  right: placement.horizontal === "left" ? 0 : "auto",
  top: placement.vertical === "down" ? 0 : "auto",
  bottom: placement.vertical === "up" ? 0 : "auto",
  transform: placement.vertical === "down"
    ? "translateY(100%)"
    : "translateY(-100%)",
});

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(function ContextMenu(
  {
    placement,
    alwaysOnTop,
    onOpenMain,
    onSettings,
    onToggleAlwaysOnTop,
    onExit,
    onClose,
  },
  ref
) {
  const handleItemClick = (callback: () => void) => (e: ReactMouseEvent) => {
    e.stopPropagation();
    callback();
    onClose();
  };

  return (
    <div
      ref={ref}
      className="floating-context-menu"
      style={getContextMenuStyle(placement)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        className="floating-context-menu-item"
        onClick={handleItemClick(onOpenMain)}
      >
        <LayoutGrid size={16} />
        <span>打开主界面</span>
      </button>
      <button
        className="floating-context-menu-item"
        onClick={handleItemClick(onSettings)}
      >
        <Settings size={16} />
        <span>设置</span>
      </button>
      <button
        className="floating-context-menu-item"
        onClick={handleItemClick(onToggleAlwaysOnTop)}
      >
        {alwaysOnTop ? <PinOff size={16} /> : <Pin size={16} />}
        <span>{alwaysOnTop ? "取消置顶" : "窗口置顶"}</span>
      </button>
      <div className="floating-context-menu-divider" />
      <button
        className="floating-context-menu-item floating-context-menu-item--danger"
        onClick={handleItemClick(onExit)}
      >
        <Power size={16} />
        <span>退出应用</span>
      </button>
    </div>
  );
});

export default ContextMenu;
