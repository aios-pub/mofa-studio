import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import {
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

type DragState = {
  startX: number;
  startY: number;
  winX: number;
  winY: number;
  moved: boolean;
};

const BALL_SIZE = 64;
const MENU_WIDTH = 240;
const MENU_HEIGHT = 300;
const MENU_GAP = 12;
const EDGE_PEEK = 18;
const DRAG_THRESHOLD = 4;

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

const getBallStyle = (placement: MenuPlacement): CSSProperties => ({
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
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);

  const appWindow = useMemo(() => {
    if (!isTauriApp()) {
      return null;
    }

    return Window.getCurrent();
  }, []);

  const dragStateRef = useRef<DragState | null>(null);
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const ballRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.classList.add("floating-body");
    document.documentElement.classList.add("floating-html");
    return () => {
      document.body.classList.remove("floating-body");
      document.documentElement.classList.remove("floating-html");
    };
  }, []);

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

    // Trigger snap animation
    setSnapping(true);

    // Animate position with easing
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
    anchorRef.current = { x: position.x, y: position.y };

    const bounds = await getMonitorBounds();
    const { width, height } = getMenuWindowSize();

    let horizontal: MenuPlacement["horizontal"] = "left";
    let vertical: MenuPlacement["vertical"] = "up";

    if (bounds) {
      const spaceLeft = position.x - bounds.x;
      const spaceRight =
        bounds.x + bounds.width - (position.x + BALL_SIZE);
      if (spaceLeft < MENU_WIDTH + MENU_GAP && spaceRight >= MENU_WIDTH + MENU_GAP) {
        horizontal = "right";
      }

      const spaceTop = position.y - bounds.y;
      const spaceBottom =
        bounds.y + bounds.height - (position.y + BALL_SIZE);
      if (spaceTop < MENU_HEIGHT + MENU_GAP && spaceBottom >= MENU_HEIGHT + MENU_GAP) {
        vertical = "down";
      }
    }

    setMenuPlacement({ horizontal, vertical });

    let nextX =
      horizontal === "left" ? position.x - (width - BALL_SIZE) : position.x;
    let nextY =
      vertical === "up" ? position.y - (height - BALL_SIZE) : position.y;

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

    const anchor = anchorRef.current;
    if (anchor) {
      await appWindow.setPosition(new LogicalPosition(anchor.x, anchor.y));
    }

    await snapToEdge();
  };

  const toggleMenu = async () => {
    if (expanded) {
      await collapseMenu();
      return;
    }

    await expandMenu();
  };

  const handlePointerDown = async (event: ReactPointerEvent) => {
    if (!appWindow || expanded) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const position = await appWindow.outerPosition();
    dragStateRef.current = {
      startX: event.screenX,
      startY: event.screenY,
      winX: position.x,
      winY: position.y,
      moved: false,
    };

    setDragging(false);
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState || !appWindow || expanded) {
      return;
    }

    const deltaX = event.screenX - dragState.startX;
    const deltaY = event.screenY - dragState.startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (!dragState.moved && distance >= DRAG_THRESHOLD) {
      dragState.moved = true;
      setDragging(true);
    }

    if (!dragState.moved) {
      return;
    }

    pendingPositionRef.current = {
      x: dragState.winX + deltaX,
      y: dragState.winY + deltaY,
    };

    if (rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const next = pendingPositionRef.current;
        if (!next || !appWindow) {
          return;
        }
        void appWindow.setPosition(new LogicalPosition(next.x, next.y));
      });
    }
  };

  const handlePointerUp = async () => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;

    if (!dragState) {
      return;
    }

    if (!dragState.moved) {
      await toggleMenu();
    } else {
      await snapToEdge();
    }

    setDragging(false);
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

  return (
    <div className={`floating-root ${expanded ? "is-expanded" : ""}`}>
      <button
        ref={ballRef}
        className={`floating-ball ${dragging ? "is-dragging" : ""} ${snapping ? "is-snapping" : ""}`}
        style={getBallStyle(menuPlacement)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
