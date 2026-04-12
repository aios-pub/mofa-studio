import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
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

type PetState = "idle" | "happy" | "sleepy" | "dragging";

type Particle = {
  id: number;
  emoji: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
};

const BALL_SIZE = 64;
const MENU_WIDTH = 240;
const MENU_HEIGHT = 380;
const MENU_GAP = 12;
const EDGE_PEEK = 32;

// ✅ 闲置气泡的触发间隔范围（毫秒）
const IDLE_BUBBLE_MIN_INTERVAL = 15000;
const IDLE_BUBBLE_MAX_INTERVAL = 45000;

const BUBBLE_MESSAGES: Record<PetState, string[]> = {
  idle: [
    "有什么可以帮你的吗? 🤔",
    "今天心情怎么样? 😊",
    "需要我帮你做些什么?",
    "休息一下吧~ ☕",
    "工作辛苦了! 💪",
    "你好呀! 👋",
  ],
  happy: ["太开心啦! 🎉", "嘻嘻~ 🥰", "再来一次! ✨"],
  sleepy: ["晚安… 💤", "好困啊… 😴", "zzz..."],
  dragging: ["我们要去哪里呀?", "放开我~ 😆"],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getMonitorBounds = async (): Promise<
  (MonitorBounds & { scaleFactor: number }) | null
> => {
  const monitor = (await currentMonitor()) ?? (await primaryMonitor());
  if (!monitor) return null;
  const s = monitor.scaleFactor;
  return {
    x: monitor.position.x / s,
    y: monitor.position.y / s,
    width: monitor.size.width / s,
    height: monitor.size.height / s,
    scaleFactor: s,
  };
};

const getMenuWindowSize = () => ({
  width: MENU_WIDTH + BALL_SIZE + MENU_GAP,
  height: MENU_HEIGHT + BALL_SIZE + MENU_GAP,
});

const getCollapsedBallStyle = (): CSSProperties => ({
  left: 0,
  top: 0,
  right: "auto",
  bottom: "auto",
});

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

const getRandomMessage = (state: PetState): string => {
  const messages = BUBBLE_MESSAGES[state] || BUBBLE_MESSAGES.idle;
  return messages[Math.floor(Math.random() * messages.length)];
};

export default function FloatingApp() {
  const [expanded, setExpanded] = useState(false);

  const setExpandedWithTrace = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const actualValue = typeof value === "function" ? value(expanded) : value;
      console.log(`[FloatingApp] setExpanded called with: ${actualValue}`);
      console.trace("[FloatingApp] setExpanded call stack");
      setExpanded(value);
    },
    [expanded],
  );

  useEffect(() => {
    console.log("[FloatingApp] expanded state changed to:", expanded);
  }, [expanded]);

  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>({
    horizontal: "left",
    vertical: "up",
  });
  const [snapping, setSnapping] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [petState, setPetState] = useState<PetState>("idle");
  const [isSpinning, setIsSpinning] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleOnLeft, setBubbleOnLeft] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const appWindow = useMemo(() => {
    if (!isTauriApp()) return null;
    return getCurrentWindow();
  }, []);

  const windowAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const ballRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const isMouseDownRef = useRef(false);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particleIdRef = useRef(0);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleBubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ 用 ref 追踪 expanded 状态，避免 showBubbleMessage 依赖 expanded 导致连锁重建
  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // ========== 辅助函数 ==========

  const updateBubblePlacement = useCallback(async () => {
    if (!appWindow) return;
    try {
      const bounds = await getMonitorBounds();
      if (!bounds) return;
      const s = bounds.scaleFactor;
      const pos = await appWindow.outerPosition();
      const logX = pos.x / s;
      setBubbleOnLeft(logX > bounds.x + bounds.width / 2);
    } catch {
      // 忽略错误
    }
  }, [appWindow]);

  const showBubbleMessage = useCallback(
    (message: string, duration = 4000) => {
      if (bubbleTimeoutRef.current) {
        clearTimeout(bubbleTimeoutRef.current);
      }
      // ✅ 仅在收起状态下根据屏幕位置更新方向；展开时由 menuPlacement 决定
      if (!expandedRef.current) {
        void updateBubblePlacement();
      }
      setBubbleText(message);
      setShowBubble(true);
      bubbleTimeoutRef.current = setTimeout(
        () => setShowBubble(false),
        duration,
      );
    },
    [updateBubblePlacement],
  );

  const spawnParticles = useCallback((emoji: string, count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        emoji,
        x: 20 + Math.random() * 24,
        y: 20 + Math.random() * 24,
        tx: (Math.random() - 0.5) * 80,
        ty: -40 - Math.random() * 40,
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.find((np) => np.id === p.id)),
      );
    }, 1000);
  }, []);

  const clearStateTimeout = useCallback(() => {
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
      stateTimeoutRef.current = null;
    }
  }, []);

  // ========== ✅ 闲置气泡定时器 ==========

  useEffect(() => {
    // 清理旧定时器
    if (idleBubbleTimerRef.current) {
      clearTimeout(idleBubbleTimerRef.current);
      idleBubbleTimerRef.current = null;
    }

    // 仅在未展开菜单、且处于 idle 状态时，定期弹出闲置气泡
    if (expanded || petState !== "idle") return;

    const scheduleNextBubble = () => {
      const delay =
        IDLE_BUBBLE_MIN_INTERVAL +
        Math.random() * (IDLE_BUBBLE_MAX_INTERVAL - IDLE_BUBBLE_MIN_INTERVAL);

      idleBubbleTimerRef.current = setTimeout(() => {
        // ✅ 使用 getRandomMessage 触发闲置气泡
        const message = getRandomMessage("idle");
        showBubbleMessage(message, 4000);
        // 递归调度下一次
        scheduleNextBubble();
      }, delay);
    };

    scheduleNextBubble();

    return () => {
      if (idleBubbleTimerRef.current) {
        clearTimeout(idleBubbleTimerRef.current);
        idleBubbleTimerRef.current = null;
      }
    };
  }, [expanded, petState, showBubbleMessage]);

  // ========== 窗口操作 ==========

  const snapToEdge = useCallback(async () => {
    if (!appWindow) return;

    const bounds = await getMonitorBounds();
    if (!bounds) return;
    const physPos = await appWindow.outerPosition();
    const physSize = await appWindow.outerSize();
    const s = bounds?.scaleFactor ?? 1;

    const position = { x: physPos.x / s, y: physPos.y / s };
    const size = { width: physSize.width / s, height: physSize.height / s };

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

    const minX = bounds.x - size.width + EDGE_PEEK;
    const maxX = bounds.x + bounds.width - EDGE_PEEK;
    const minY = bounds.y - size.height + EDGE_PEEK;
    const maxY = bounds.y + bounds.height - EDGE_PEEK;

    targetX = clamp(targetX, minX, maxX);
    targetY = clamp(targetY, minY, maxY);

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
  }, [appWindow]);

  const expandMenu = useCallback(async () => {
    if (!appWindow) {
      setExpandedWithTrace(true);
      return;
    }
    const bounds = await getMonitorBounds();
    const s = bounds?.scaleFactor ?? 1;
    const physPos = await appWindow.outerPosition();

    const logicalPos = { x: physPos.x / s, y: physPos.y / s };
    windowAnchorRef.current = logicalPos;
    const { width, height } = getMenuWindowSize();

    let visibleX = logicalPos.x;
    let visibleY = logicalPos.y;
    if (bounds) {
      if (logicalPos.x < bounds.x) visibleX = bounds.x;
      if (logicalPos.x + BALL_SIZE > bounds.x + bounds.width)
        visibleX = bounds.x + bounds.width - BALL_SIZE;
      if (logicalPos.y < bounds.y) visibleY = bounds.y;
      if (logicalPos.y + BALL_SIZE > bounds.y + bounds.height)
        visibleY = bounds.y + bounds.height - BALL_SIZE;
    }

    type CandidatePlacement = {
      horizontal: "left" | "right";
      vertical: "up" | "down";
      x: number;
      y: number;
      overflow: number;
    };

    const candidates: CandidatePlacement[] = [];
    const combinations: Array<{ h: "left" | "right"; v: "up" | "down" }> = [
      { h: "right", v: "down" },
      { h: "right", v: "up" },
      { h: "left", v: "down" },
      { h: "left", v: "up" },
    ];

    for (const { h, v } of combinations) {
      let x = h === "right" ? visibleX : visibleX - MENU_WIDTH - MENU_GAP;
      let y = v === "down" ? visibleY : visibleY - MENU_HEIGHT - MENU_GAP;

      let overflow = 0;
      if (bounds) {
        if (x < bounds.x) overflow += bounds.x - x;
        if (x + width > bounds.x + bounds.width)
          overflow += x + width - (bounds.x + bounds.width);
        if (y < bounds.y) overflow += bounds.y - y;
        if (y + height > bounds.y + bounds.height)
          overflow += y + height - (bounds.y + bounds.height);
      }
      candidates.push({ horizontal: h, vertical: v, x, y, overflow });
    }

    candidates.sort((a, b) => {
      if (a.overflow !== b.overflow) return a.overflow - b.overflow;
      const order = (c: CandidatePlacement) => {
        let score = 0;
        if (c.horizontal === "right") score += 2;
        if (c.vertical === "down") score += 1;
        return -score;
      };
      return order(a) - order(b);
    });

    const best = candidates[0];

    setMenuPlacement({ horizontal: best.horizontal, vertical: best.vertical });

    let nextX = Number.isFinite(best.x) ? best.x : visibleX;
    let nextY = Number.isFinite(best.y) ? best.y : visibleY;

    if (bounds) {
      nextX = clamp(nextX, bounds.x, bounds.x + bounds.width - width);
      nextY = clamp(nextY, bounds.y, bounds.y + bounds.height - height);
    }

    try {
      await appWindow.setSize(new LogicalSize(width, height));
      await appWindow.setPosition(new LogicalPosition(nextX, nextY));
      setExpanded(true);
    } catch (e) {
      console.error("[FloatingApp] Error in expandMenu:", e);
    }
  }, [appWindow]);

  const collapseMenu = useCallback(async () => {
    if (!appWindow) {
      setExpanded(false);
      return;
    }

    // ✅ 收起时清除正在显示的气泡，防止切换到收起布局时位置突变
    setShowBubble(false);
    if (bubbleTimeoutRef.current) {
      clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = null;
    }

    setExpanded(false);
    await appWindow.setSize(new LogicalSize(BALL_SIZE, BALL_SIZE));

    const anchor = windowAnchorRef.current;
    if (anchor) {
      await appWindow.setPosition(new LogicalPosition(anchor.x, anchor.y));
    }
  }, [appWindow]);

  const toggleMenu = useCallback(async () => {
    if (expanded) {
      await collapseMenu();
    } else {
      await expandMenu();
    }
  }, [expanded, collapseMenu, expandMenu]);

  // ========== 桌宠交互 ==========

  const handlePlay = useCallback(() => {
    clearStateTimeout();
    setPetState("happy");
    setIsSpinning(true);
    spawnParticles("✨", 6);
    spawnParticles("💖", 4);
    // ✅ 使用 getRandomMessage 而非硬编码
    showBubbleMessage(getRandomMessage("happy"), 2500);
    setTimeout(() => setIsSpinning(false), 600);
    stateTimeoutRef.current = setTimeout(() => setPetState("idle"), 2500);
  }, [spawnParticles, showBubbleMessage, clearStateTimeout]);

  const handleSleep = useCallback(() => {
    clearStateTimeout();
    setPetState("sleepy");
    // ✅ 使用 getRandomMessage
    showBubbleMessage(getRandomMessage("sleepy"), 4000);
    stateTimeoutRef.current = setTimeout(() => {
      setPetState("idle");
      setShowBubble(false);
    }, 5000);
  }, [showBubbleMessage, clearStateTimeout]);

  const handleFeed = useCallback(() => {
    clearStateTimeout();
    spawnParticles("🍎", 4);
    spawnParticles("💕", 3);
    setPetState("happy");
    // ✅ 使用 getRandomMessage
    showBubbleMessage(getRandomMessage("happy"), 2500);
    stateTimeoutRef.current = setTimeout(() => setPetState("idle"), 2500);
  }, [spawnParticles, showBubbleMessage, clearStateTimeout]);

  // ========== 事件处理 ==========

  const handlePointerDown = (event: ReactPointerEvent) => {
    if (!appWindow || expanded || event.button !== 0) return;

    isDraggingRef.current = false;
    isMouseDownRef.current = true;
    dragStartRef.current = { x: event.clientX, y: event.clientY };

    dragTimerRef.current = setTimeout(() => {
      if (isMouseDownRef.current && !isDraggingRef.current) {
        isDraggingRef.current = true;
        setPetState("dragging");
        // ✅ 拖拽时显示 dragging 消息
        showBubbleMessage(getRandomMessage("dragging"), 3000);
        void appWindow.startDragging();
      }
    }, 300);
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    if (!appWindow || expanded || !isMouseDownRef.current) return;

    const start = dragStartRef.current;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 15 && !isDraggingRef.current) {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      isDraggingRef.current = true;
      setPetState("dragging");
      // ✅ 拖拽时显示 dragging 消息
      showBubbleMessage(getRandomMessage("dragging"), 3000);
      void appWindow.startDragging();
    }
  };

  const handlePointerUp = async () => {
    if (!appWindow || expanded) return;

    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    const wasDragging = isDraggingRef.current;
    isMouseDownRef.current = false;
    dragStartRef.current = null;
    isDraggingRef.current = false;

    if (wasDragging) {
      setPetState("idle");
      setShowBubble(false);
      await snapToEdge();
    }
  };

  const handleClick = async () => {
    if (expanded) return;
    if (isDraggingRef.current) return;
    await toggleMenu();
  };

  const handleDoubleClick = async () => {
    if (expanded) return;
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    isDraggingRef.current = false;
    isMouseDownRef.current = false;
    await toggleMenu();
  };

  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    if (expanded) return;
    setContextMenuVisible(true);
  };

  // ========== 其他操作 ==========

  const toggleAlwaysOnTop = async () => {
    if (!appWindow) return;
    const newValue = !alwaysOnTop;
    setAlwaysOnTop(newValue);
    await appWindow.setAlwaysOnTop(newValue);
  };

  const openMainWindow = async (path?: string) => {
    if (!appWindow) return;

    const mainWindow = await Window.getByLabel("main");
    if (mainWindow) {
      await mainWindow.show();
      await mainWindow.setFocus();
      if (path) {
        await mainWindow.emit("floating:navigate", { path });
      }
    }

    const bounds = await getMonitorBounds();
    const s = bounds?.scaleFactor ?? 1;
    const pos = await appWindow.outerPosition();
    windowAnchorRef.current = { x: pos.x / s, y: pos.y / s };

    await collapseMenu();
    await appWindow.hide();
  };

  const convertToWindow = async () => {
    if (!appWindow) return;

    const bounds = await getMonitorBounds();
    const s = bounds?.scaleFactor ?? 1;
    const position = await appWindow.outerPosition();

    const mainWindow = await Window.getByLabel("main");
    if (mainWindow) {
      await mainWindow.setPosition(
        new LogicalPosition(
          Math.max(0, position.x / s - 350),
          Math.max(0, position.y / s - 150),
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
    if (!appWindow) return;
    const windows = await Window.getAll();
    await Promise.all(windows.map((win) => win.close()));
  };

  const handleQuickInput = async (message: string) => {
    if (!appWindow) return;

    const mainWindow = await Window.getByLabel("main");
    if (mainWindow) {
      await mainWindow.show();
      await mainWindow.setFocus();
      await mainWindow.emit("floating:quick-message", { message });
    }

    await collapseMenu();
    await appWindow.hide();
  };

  // ========== Effects ==========

  useEffect(() => {
    if (!appWindow) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      unlisten = await appWindow.listen("tray:reset-pet", async () => {
        setExpanded(false);
        setPetState("idle");
        setContextMenuVisible(false);

        await appWindow.setSize(new LogicalSize(BALL_SIZE, BALL_SIZE));
        await appWindow.show();
        await appWindow.setFocus();

        const bounds = await getMonitorBounds();
        if (bounds) {
          const s = bounds.scaleFactor;
          const pos = await appWindow.outerPosition();
          const logX = pos.x / s;
          const logY = pos.y / s;

          const isOffScreen =
            logX < bounds.x - BALL_SIZE ||
            logX > bounds.x + bounds.width ||
            logY < bounds.y - BALL_SIZE ||
            logY > bounds.y + bounds.height;

          if (isOffScreen) {
            await appWindow.setPosition(
              new LogicalPosition(
                bounds.x + bounds.width - BALL_SIZE - 50,
                bounds.y + bounds.height / 2,
              ),
            );
          }
        }
      });
    };

    void setup();
    return () => unlisten?.();
  }, [appWindow]);

  // ✅ 新增：首次加载时显示欢迎气泡
  useEffect(() => {
    const timer = setTimeout(() => {
      showBubbleMessage("你好呀! 👋", 3000);
    }, 2000);
    return () => clearTimeout(timer);
  }, [showBubbleMessage]);

  // ✅ 清理所有定时器
  useEffect(() => {
    return () => {
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
      if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
      if (idleBubbleTimerRef.current) clearTimeout(idleBubbleTimerRef.current);
      if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    };
  }, []);

  // ========== 渲染 ==========

  const ballStyle = expanded
    ? getExpandedBallStyle(menuPlacement)
    : getCollapsedBallStyle();

  const getPetStateClassName = () => {
    const classes: string[] = [];
    if (snapping) classes.push("is-snapping");
    if (petState === "dragging") classes.push("is-dragging");
    if (petState === "happy") classes.push("is-happy");
    if (petState === "sleepy") classes.push("is-sleepy");
    if (isSpinning) classes.push("is-spinning");
    return classes.join(" ");
  };

  // ✅ 展开时根据菜单方位决定气泡方向；收起时用屏幕位置
  // 气泡必须朝向菜单一侧（窗口内有空间的方向），否则超出窗口会被裁剪
  const effectiveBubbleOnLeft = expanded
    ? menuPlacement.horizontal === "left"
    : bubbleOnLeft;

  // ✅ 展开时用内联样式精确定位气泡到球旁、菜单上方，避免遮挡菜单操作区
  const bubblePositionStyle: CSSProperties | undefined = expanded
    ? {
        position: "absolute",
        zIndex: 100,
        pointerEvents: "none",
        // 垂直方向：与球对齐
        ...(menuPlacement.vertical === "down"
          ? { top: 14 }
          : { bottom: 14, top: "auto" }),
        // 水平方向：紧贴球的菜单侧
        ...(menuPlacement.horizontal === "right"
          ? { left: BALL_SIZE + 8, right: "auto" }
          : { right: BALL_SIZE + 8, left: "auto" }),
      }
    : undefined;

  return (
    <div className={`floating-root ${expanded ? "is-expanded" : ""}`}>
      {/* ✅ 移除 !expanded 条件，展开时也能显示气泡 */}
      {showBubble && (
        <div
          className={`pet-bubble ${effectiveBubbleOnLeft ? "is-left" : ""} ${
            expanded ? "is-expanded-bubble" : ""
          }`}
          style={bubblePositionStyle}
        >
          {bubbleText}
        </div>
      )}

      <button
        ref={ballRef}
        className={`floating-ball ${getPetStateClassName()}`}
        style={ballStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        aria-label={expanded ? "收起菜单" : "展开菜单"}
      >
        <img src="/claw512.png" alt="AMOS" />

        <div className="pet-effects">
          {particles.map((p) => (
            <span
              key={p.id}
              className="particle"
              style={
                {
                  left: p.x,
                  top: p.y,
                  "--tx": `${p.tx}px`,
                  "--ty": `${p.ty}px`,
                } as CSSProperties
              }
            >
              {p.emoji}
            </span>
          ))}
        </div>

        {petState === "sleepy" && <span className="pet-zzz">💤</span>}
      </button>

      {expanded && (
        <div
          ref={menuRef}
          className="floating-menu"
          style={getMenuStyle(menuPlacement)}
        >
          <div className="floating-menu-header">
            <div className="floating-menu-title">
              <img src="/claw512.png" alt="AMOS" />
              <div>
                <div className="floating-menu-name">AMOS</div>
                <div className="floating-menu-subtitle">你的桌面伙伴</div>
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
              className="floating-menu-item floating-menu-item--pet-action"
              onClick={() => handleFeed()}
            >
              <span>🍎</span>
              <span>喂食</span>
            </button>
            <button
              className="floating-menu-item floating-menu-item--pet-action"
              onClick={() => handlePlay()}
            >
              <span>🎾</span>
              <span>玩耍</span>
            </button>
            <button
              className="floating-menu-item floating-menu-item--pet-action"
              onClick={() => handleSleep()}
            >
              <span>💤</span>
              <span>睡觉</span>
            </button>

            <div
              style={{
                height: 1,
                background: "rgba(148, 163, 184, 0.2)",
                margin: "4px 0",
              }}
            />

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
            <button
              className="floating-menu-item"
              onClick={() => void exitApp()}
            >
              <span>👋 退出应用</span>
            </button>
          </div>

          <QuickInput onSubmit={(msg) => void handleQuickInput(msg)} />
        </div>
      )}

      {contextMenuVisible && !expanded && (
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
      )}
    </div>
  );
}
