import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
} from "react";
import {
  getCurrentWindow,
  Window,
  LogicalPosition,
  LogicalSize,
  currentMonitor,
  primaryMonitor,
} from "@tauri-apps/api/window";
import {
  MessageCircle,
  History,
  Settings,
  LayoutGrid,
  X,
  Maximize2,
} from "lucide-react";
import { isTauriApp } from "../utils/tauri";
import ContextMenu from "./ContextMenu";
import QuickInput from "./QuickInput";
import "./floating.css";

type MenuPlacement = {
  horizontal: "left" | "right";
  vertical: "up" | "down";
};

type MonitorBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const BALL_SIZE = 64;
const MENU_WIDTH = 240;
const MENU_HEIGHT = 300;
const MENU_GAP = 12;
const EDGE_PEEK = 18;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getMonitorBounds = async (): Promise<MonitorBounds | null> => {
  const monitor = (await currentMonitor()) ?? (await primaryMonitor());
  if (!monitor) {
    return null;
  }

  return {
    x: monitor.position.x,
    y: monitor.position.y,
    width: monitor.size.width,
    height: monitor.size.height,
  };
};

const getMenuWindowSize = () => ({
  width: MENU_WIDTH + BALL_SIZE + MENU_GAP,
  height: MENU_HEIGHT + BALL_SIZE + MENU_GAP,
});

// 收起状态下的球体样式 - 填满整个窗口
const getCollapsedBallStyle = (): CSSProperties => ({
  left: 0,
  top: 0,
  right: "auto",
  bottom: "auto",
});

// 展开状态下的球体样式 - 根据菜单位置定位
const getExpandedBallStyle = (placement: MenuPlacement): CSSProperties => ({
  left: placement.horizontal === "right" ? 0 : "auto",
  right: placement.horizontal === "left" ? 0 : "auto",
  top: placement.vertical === "down" ? 0 : "auto",
  bottom: placement.vertical === "up" ? 0 : "auto",
});

const getMenuStyle = (placement: MenuPlacement): CSSProperties => ({
  left: placement.horizontal === "right" ? BALL_SIZE + MENU_GAP : "auto",
  right: placement.horizontal === "left" ? BALL_SIZE + MENU_GAP : "auto",
  top: placement.vertical === "down" ? BALL_SIZE + MENU_GAP : "auto",
  bottom: placement.vertical === "up" ? BALL_SIZE + MENU_GAP : "auto",
});

export default function FloatingApp() {
  const [expanded, setExpanded] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>({
    horizontal: "left",
    vertical: "up",
  });
  const [snapping, setSnapping] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);

  const appWindow = useMemo(() => {
    if (!isTauriApp()) {
      return null;
    }
    return getCurrentWindow();
  }, []);

  const windowAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const ballRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const isMouseDownRef = useRef(false);

  useEffect(() => {
    if (!appWindow) {
      return;
    }

    void appWindow.setAlwaysOnTop(true);
    void appWindow.setSkipTaskbar(true);
  }, [appWindow]);

  useEffect(() => {
    if (!expanded && !contextMenuVisible) {
      return;
    }

    const handlePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ballRef.current?.contains(target)) {
        return;
      }
      if (expanded && menuRef.current?.contains(target)) {
        return;
      }
      if (contextMenuVisible && contextMenuRef.current?.contains(target)) {
        return;
      }

      if (expanded) {
        void collapseMenu();
      }
      if (contextMenuVisible) {
        setContextMenuVisible(false);
      }
    };

    window.addEventListener("pointerdown", handlePointer);
    return () => window.removeEventListener("pointerdown", handlePointer);
  }, [expanded, contextMenuVisible]);

  const snapToEdge = async () => {
    if (!appWindow) {
      return;
    }

    const bounds = await getMonitorBounds();
    if (!bounds) {
      return;
    }

    const position = await appWindow.outerPosition();
    const size = await appWindow.outerSize();

    const leftDistance = Math.abs(position.x - bounds.x);
    const rightDistance = Math.abs(
      bounds.x + bounds.width - (position.x + size.width),
    );
    const topDistance = Math.abs(position.y - bounds.y);
    const bottomDistance = Math.abs(
      bounds.y + bounds.height - (position.y + size.height),
    );

    const minDistance = Math.min(
      leftDistance,
      rightDistance,
      topDistance,
      bottomDistance,
    );

    let targetX = position.x;
    let targetY = position.y;

    if (minDistance === leftDistance) {
      targetX = bounds.x - (size.width - EDGE_PEEK);
    } else if (minDistance === rightDistance) {
      targetX = bounds.x + bounds.width - EDGE_PEEK;
    } else if (minDistance === topDistance) {
      targetY = bounds.y - (size.height - EDGE_PEEK);
    } else {
      targetY = bounds.y + bounds.height - EDGE_PEEK;
    }

    setSnapping(true);

    const startX = position.x;
    const startY = position.y;
    const duration = 280;
    const startTime = performance.now();

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = async (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      const currentX = startX + (targetX - startX) * eased;
      const currentY = startY + (targetY - startY) * eased;

      await appWindow.setPosition(new LogicalPosition(currentX, currentY));

      if (progress < 1) {
        requestAnimationFrame((time) => void animate(time));
      } else {
        setSnapping(false);
      }
    };

    requestAnimationFrame((time) => void animate(time));
  };

  const expandMenu = async () => {
    if (!appWindow) {
      setExpanded(true);
      return;
    }

    const position = await appWindow.outerPosition();
    windowAnchorRef.current = { x: position.x, y: position.y };

    const bounds = await getMonitorBounds();
    const { width, height } = getMenuWindowSize();

    let horizontal: MenuPlacement["horizontal"] = "left";
    let vertical: MenuPlacement["vertical"] = "up";

    if (bounds) {
      const spaceLeft = position.x - bounds.x;
      const spaceRight = bounds.x + bounds.width - (position.x + BALL_SIZE);
      if (spaceLeft < MENU_WIDTH + MENU_GAP && spaceRight >= MENU_WIDTH + MENU_GAP) {
        horizontal = "right";
      }

      const spaceTop = position.y - bounds.y;
      const spaceBottom = bounds.y + bounds.height - (position.y + BALL_SIZE);
      if (spaceTop < MENU_HEIGHT + MENU_GAP && spaceBottom >= MENU_HEIGHT + MENU_GAP) {
        vertical = "down";
      }
    }

    setMenuPlacement({ horizontal, vertical });

    let nextX = horizontal === "left" ? position.x - (width - BALL_SIZE) : position.x;
    let nextY = vertical === "up" ? position.y - (height - BALL_SIZE) : position.y;

    if (bounds) {
      nextX = clamp(nextX, bounds.x, bounds.x + bounds.width - width);
      nextY = clamp(nextY, bounds.y, bounds.y + bounds.height - height);
    }

    await appWindow.setSize(new LogicalSize(width, height));
    await appWindow.setPosition(new LogicalPosition(nextX, nextY));
    setExpanded(true);
  };

  const collapseMenu = async () => {
    if (!appWindow) {
      setExpanded(false);
      return;
    }

    setExpanded(false);
    await appWindow.setSize(new LogicalSize(BALL_SIZE, BALL_SIZE));

    const anchor = windowAnchorRef.current;
    if (anchor) {
      await appWindow.setPosition(new LogicalPosition(anchor.x, anchor.y));
    }

    await snapToEdge();
  };

  const toggleMenu = async () => {
    if (expanded) {
      await collapseMenu();
    } else {
      await expandMenu();
    }
  };

  // 使用 Tauri 的 startDragging 进行窗口拖动
  const handleMouseDown = async (event: ReactMouseEvent) => {
    if (!appWindow || expanded) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    // 记录起始位置用于判断是点击还是拖动
    isDraggingRef.current = false;
    isMouseDownRef.current = true;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: ReactMouseEvent) => {
    if (!appWindow || expanded || !isMouseDownRef.current) {
      return;
    }

    const start = dragStartRef.current;
    if (!start) {
      return;
    }

    // 判断是否开始拖动（移动超过 5px）
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5 && !isDraggingRef.current) {
      isDraggingRef.current = true;
      // 使用 Tauri 的 startDragging 方法
      void appWindow.startDragging();
    }
  };

  const handleMouseUp = async () => {
    if (!appWindow || expanded) {
      return;
    }

    isMouseDownRef.current = false;
    dragStartRef.current = null;

    // 如果没有拖动，则展开菜单
    if (!isDraggingRef.current) {
      await toggleMenu();
    } else {
      // 拖动结束后吸附到边缘
      await snapToEdge();
    }

    isDraggingRef.current = false;
  };

  const handleContextMenu = async (event: ReactMouseEvent) => {
    event.preventDefault();
    if (expanded) {
      return;
    }
    setContextMenuVisible(true);
  };

  const toggleAlwaysOnTop = async () => {
    if (!appWindow) {
      return;
    }
    const newValue = !alwaysOnTop;
    setAlwaysOnTop(newValue);
    await appWindow.setAlwaysOnTop(newValue);
  };

  const openMainWindow = async (path?: string) => {
    if (!appWindow) {
      return;
    }

    const mainWindow = await Window.getByLabel("main");
    if (mainWindow) {
      await mainWindow.show();
      await mainWindow.setFocus();
      if (path) {
        await mainWindow.emit("floating:navigate", { path });
      }
    }

    await collapseMenu();
    await appWindow.hide();
  };

  const convertToWindow = async () => {
    if (!appWindow) return;

    const position = await appWindow.outerPosition();
    const mainWindow = await Window.getByLabel("main");

    if (mainWindow) {
      await mainWindow.setPosition(
        new LogicalPosition(
          Math.max(0, position.x - 350),
          Math.max(0, position.y - 150),
        ),
      );
      await mainWindow.show();
      await mainWindow.setFocus();
    }

    setExpanded(false);
    await appWindow.setSize(new LogicalSize(BALL_SIZE, BALL_SIZE));
    await appWindow.hide();
  };

  const exitApp = async () => {
    if (!appWindow) {
      return;
    }

    const windows = await Window.getAll();
    await Promise.all(windows.map((win) => win.close()));
  };

  const handleQuickInput = async (message: string) => {
    if (!appWindow) {
      return;
    }

    const mainWindow = await Window.getByLabel("main");
    if (mainWindow) {
      await mainWindow.show();
      await mainWindow.setFocus();
      await mainWindow.emit("floating:quick-message", { message });
    }

    await collapseMenu();
    await appWindow.hide();
  };

  // 根据展开状态获取球体样式
  const ballStyle = expanded ? getExpandedBallStyle(menuPlacement) : getCollapsedBallStyle();

  return (
    <div className={`floating-root ${expanded ? "is-expanded" : ""}`}>
      <button
        ref={ballRef}
        className={`floating-ball ${snapping ? "is-snapping" : ""}`}
        style={ballStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        aria-label={expanded ? "收起菜单" : "展开菜单"}
      >
        <img src="/claw512.png" alt="Amos-Claw" />
      </button>

      {expanded ? (
        <div
          ref={menuRef}
          className="floating-menu"
          style={getMenuStyle(menuPlacement)}
        >
          <div className="floating-menu-header">
            <div className="floating-menu-title">
              <img src="/claw512.png" alt="Amos-Claw" />
              <div>
                <div className="floating-menu-name">Amos-Claw</div>
                <div className="floating-menu-subtitle">悬浮快速入口</div>
              </div>
            </div>
            <div className="floating-menu-header-actions">
              <button
                className="floating-menu-action"
                onClick={() => void convertToWindow()}
                aria-label="窗口化"
              >
                <Maximize2 size={14} />
              </button>
              <button
                className="floating-menu-action"
                onClick={() => void collapseMenu()}
                aria-label="关闭菜单"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="floating-menu-items">
            <button
              className="floating-menu-item"
              onClick={() => void openMainWindow("/conversation")}
            >
              <MessageCircle size={18} />
              <span>新对话</span>
            </button>
            <button
              className="floating-menu-item"
              onClick={() => void openMainWindow("/conversation")}
            >
              <History size={18} />
              <span>历史记录</span>
            </button>
            <button
              className="floating-menu-item"
              onClick={() => void openMainWindow("/system/settings")}
            >
              <Settings size={18} />
              <span>设置</span>
            </button>
            <button
              className="floating-menu-item"
              onClick={() => void openMainWindow("/")}
            >
              <LayoutGrid size={18} />
              <span>打开主界面</span>
            </button>
          </div>

          <div className="floating-menu-footer">
            <button className="floating-menu-item" onClick={exitApp}>
              <span>退出应用</span>
            </button>
          </div>

          <QuickInput onSubmit={(msg) => void handleQuickInput(msg)} />
        </div>
      ) : null}

      {contextMenuVisible && !expanded ? (
        <ContextMenu
          ref={contextMenuRef}
          placement={menuPlacement}
          alwaysOnTop={alwaysOnTop}
          onOpenMain={() => void openMainWindow("/")}
          onSettings={() => void openMainWindow("/system/settings")}
          onToggleAlwaysOnTop={() => void toggleAlwaysOnTop()}
          onExit={() => void exitApp()}
          onClose={() => setContextMenuVisible(false)}
        />
      ) : null}
    </div>
  );
}
