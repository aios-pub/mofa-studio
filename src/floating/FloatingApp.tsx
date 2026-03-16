import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
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
const EDGE_PEEK = 18;

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

const getMonitorBounds = async (): Promise<MonitorBounds | null> => {
  const monitor = (await currentMonitor()) ?? (await primaryMonitor());
  if (!monitor) return null;
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

  // 包装 setExpanded 以追踪调用来源
  const setExpandedWithTrace = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    const actualValue = typeof value === 'function' ? value(expanded) : value;
    console.log(`[FloatingApp] setExpanded called with: ${actualValue}`);
    console.trace("[FloatingApp] setExpanded call stack");
    setExpanded(value);
  }, [expanded]);

  // 追踪 expanded 状态变化
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

  // ========== 辅助函数 ==========

  const showBubbleMessage = useCallback((message: string, duration = 4000) => {
    if (bubbleTimeoutRef.current) {
      clearTimeout(bubbleTimeoutRef.current);
    }
    setBubbleText(message);
    setShowBubble(true);
    bubbleTimeoutRef.current = setTimeout(() => setShowBubble(false), duration);
  }, []);

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
        prev.filter((p) => !newParticles.find((np) => np.id === p.id))
      );
    }, 1000);
  }, []);

  const clearStateTimeout = useCallback(() => {
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
      stateTimeoutRef.current = null;
    }
  }, []);

  // ========== 窗口操作 ==========

  const snapToEdge = useCallback(async () => {
    if (!appWindow) return;

    const bounds = await getMonitorBounds();
    if (!bounds) return;

    const position = await appWindow.outerPosition();
    const size = await appWindow.outerSize();

    const leftDistance = Math.abs(position.x - bounds.x);
    const rightDistance = Math.abs(bounds.x + bounds.width - (position.x + size.width));
    const topDistance = Math.abs(position.y - bounds.y);
    const bottomDistance = Math.abs(bounds.y + bounds.height - (position.y + size.height));

    const minDistance = Math.min(leftDistance, rightDistance, topDistance, bottomDistance);

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
  }, [appWindow]);

  const expandMenu = useCallback(async () => {
    console.log("[FloatingApp] expandMenu called, appWindow:", !!appWindow);
    if (!appWindow) {
      console.log("[FloatingApp] No appWindow, setting expanded=true directly");
      setExpandedWithTrace(true);
      return;
    }

    console.log("[FloatingApp] Getting current position...");
    const position = await appWindow.outerPosition();
    console.log("[FloatingApp] Current position:", position.x, position.y);
    windowAnchorRef.current = { x: position.x, y: position.y };

    const bounds = await getMonitorBounds();
    const { width, height } = getMenuWindowSize();
    console.log("[FloatingApp] Menu window size:", width, height, "bounds:", bounds);

    // 计算宠物可见部分的位置（考虑吸附边缘的情况）
    let visibleX = position.x;
    let visibleY = position.y;

    if (bounds) {
      // 如果宠物在左边缘外，计算可见位置
      if (position.x < bounds.x) {
        visibleX = bounds.x;
      }
      // 如果宠物在右边缘外
      if (position.x + BALL_SIZE > bounds.x + bounds.width) {
        visibleX = bounds.x + bounds.width - BALL_SIZE;
      }
      // 如果宠物在上边缘外
      if (position.y < bounds.y) {
        visibleY = bounds.y;
      }
      // 如果宠物在下边缘外
      if (position.y + BALL_SIZE > bounds.y + bounds.height) {
        visibleY = bounds.y + bounds.height - BALL_SIZE;
      }
    }

    // 计算四个方向展开后的窗口位置
    // horizontal: "right" 表示菜单在宠物右边（宠物在窗口左上角）
    // horizontal: "left" 表示菜单在宠物左边（宠物在窗口右上角）
    // vertical: "down" 表示菜单在宠物下边（宠物在窗口左上角）
    // vertical: "up" 表示菜单在宠物上边（宠物在窗口左下角）

    type CandidatePlacement = {
      horizontal: "left" | "right";
      vertical: "up" | "down";
      x: number;
      y: number;
      overflow: number; // 超出屏幕的像素数
    };

    const candidates: CandidatePlacement[] = [];

    const combinations: Array<{ h: "left" | "right"; v: "up" | "down" }> = [
      { h: "right", v: "down" },
      { h: "right", v: "up" },
      { h: "left", v: "down" },
      { h: "left", v: "up" },
    ];

    for (const { h, v } of combinations) {
      let x: number;
      let y: number;

      if (h === "right") {
        // 菜单在右边，宠物在左边角落
        x = visibleX;
      } else {
        // 菜单在左边，宠物在右边角落
        x = visibleX - MENU_WIDTH - MENU_GAP;
      }

      if (v === "down") {
        // 菜单在下边，宠物在上边角落
        y = visibleY;
      } else {
        // 菜单在上边，宠物在下边角落
        y = visibleY - MENU_HEIGHT - MENU_GAP;
      }

      // 计算超出屏幕的像素数
      let overflow = 0;
      if (bounds) {
        if (x < bounds.x) overflow += bounds.x - x;
        if (x + width > bounds.x + bounds.width) overflow += x + width - (bounds.x + bounds.width);
        if (y < bounds.y) overflow += bounds.y - y;
        if (y + height > bounds.y + bounds.height) overflow += y + height - (bounds.y + bounds.height);
      }

      candidates.push({ horizontal: h, vertical: v, x, y, overflow });
    }

    // 选择超出最少的方向，优先选择向下向右（更自然的展开方向）
    candidates.sort((a, b) => {
      if (a.overflow !== b.overflow) {
        return a.overflow - b.overflow;
      }
      // 优先级：右下 > 右上 > 左下 > 左上
      const order = (c: CandidatePlacement) => {
        let score = 0;
        if (c.horizontal === "right") score += 2;
        if (c.vertical === "down") score += 1;
        return -score; // 负数使得高优先级排在前面
      };
      return order(a) - order(b);
    });

    const best = candidates[0];
    console.log("[FloatingApp] Candidates:", candidates.map(c => `${c.horizontal}-${c.vertical}: overflow=${c.overflow}`));
    console.log("[FloatingApp] Best placement:", best.horizontal, best.vertical);

    setMenuPlacement({ horizontal: best.horizontal, vertical: best.vertical });

    // 使用最佳位置
    let nextX = best.x;
    let nextY = best.y;

    // 确保 position 是有效的数字
    if (!Number.isFinite(nextX)) nextX = visibleX;
    if (!Number.isFinite(nextY)) nextY = visibleY;

    // Clamp to screen bounds - 确保窗口完全在屏幕内
    if (bounds) {
      nextX = clamp(nextX, bounds.x, bounds.x + bounds.width - width);
      nextY = clamp(nextY, bounds.y, bounds.y + bounds.height - height);
    }

    console.log("[FloatingApp] Calculated position:", nextX, nextY);

    // 先调整窗口大小和位置
    try {
      console.log("[FloatingApp] Setting window size to:", width, height);
      await appWindow.setSize(new LogicalSize(width, height));

      // 验证窗口大小是否改变
      const newSize = await appWindow.outerSize();
      console.log("[FloatingApp] Window size after setSize:", newSize.width, newSize.height);

      console.log("[FloatingApp] Setting window position to:", nextX, nextY);
      await appWindow.setPosition(new LogicalPosition(nextX, nextY));

      // 然后设置 expanded，让 React 开始渲染菜单
      console.log("[FloatingApp] About to setExpanded(true)");
      setExpandedWithTrace(true);

      console.log("[FloatingApp] expandMenu complete");
    } catch (e) {
      console.error("[FloatingApp] Error resizing/positioning window:", e);
    }
  }, [appWindow]);

  const collapseMenu = useCallback(async () => {
    if (!appWindow) {
      setExpandedWithTrace(false);
      return;
    }

    setExpandedWithTrace(false);
    await appWindow.setSize(new LogicalSize(BALL_SIZE, BALL_SIZE));

    const anchor = windowAnchorRef.current;
    if (anchor) {
      await appWindow.setPosition(new LogicalPosition(anchor.x, anchor.y));
    }

    await snapToEdge();
  }, [appWindow, snapToEdge]);

  const toggleMenu = useCallback(async () => {
    console.log("[FloatingApp] toggleMenu called, current expanded:", expanded);
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
    spawnParticles("✨", 6);
    spawnParticles("💖", 4);
    showBubbleMessage("太开心啦! 🎉", 2500);
    stateTimeoutRef.current = setTimeout(() => setPetState("idle"), 2500);
  }, [spawnParticles, showBubbleMessage, clearStateTimeout]);

  const handleSleep = useCallback(() => {
    clearStateTimeout();
    setPetState("sleepy");
    showBubbleMessage("晚安… 💤", 4000);
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
    showBubbleMessage("好好吃! 😋", 2500);
    stateTimeoutRef.current = setTimeout(() => setPetState("idle"), 2500);
  }, [spawnParticles, showBubbleMessage, clearStateTimeout]);

  // ========== 事件处理 ==========

  const handlePointerDown = (event: ReactPointerEvent) => {
    console.log("[FloatingApp] handlePointerDown triggered, button:", event.button, "expanded:", expanded);
    if (!appWindow || expanded || event.button !== 0) return;

    isDraggingRef.current = false;
    isMouseDownRef.current = true;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    console.log("[FloatingApp] handlePointerDown: set isDragging to false, isMouseDown to true");

    // 不使用 setPointerCapture，避免干扰点击事件
    dragTimerRef.current = setTimeout(() => {
      console.log("[FloatingApp] dragTimer fired, isMouseDown:", isMouseDownRef.current, "isDragging:", isDraggingRef.current);
      if (isMouseDownRef.current && !isDraggingRef.current) {
        isDraggingRef.current = true;
        setPetState("dragging");
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
      console.log("[FloatingApp] handlePointerMove: distance >", 15, ", setting isDragging to true");
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      isDraggingRef.current = true;
      setPetState("dragging");
      void appWindow.startDragging();
    }
  };

  const handlePointerUp = async () => {
    console.log("[FloatingApp] handlePointerUp triggered, isDragging:", isDraggingRef.current, "isMouseDown:", isMouseDownRef.current);
    if (!appWindow || expanded) return;

    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    const wasDragging = isDraggingRef.current;
    isMouseDownRef.current = false;
    dragStartRef.current = null;
    isDraggingRef.current = false;
    console.log("[FloatingApp] handlePointerUp: reset isDragging to false, wasDragging:", wasDragging);

    if (wasDragging) {
      setPetState("idle");
      await snapToEdge();
    }
    // 不在这里 toggle，让 onClick 处理
  };

  // 使用 onClick 作为主要的点击处理方式
  const handleClick = async () => {
    console.log("[FloatingApp] handleClick triggered, expanded:", expanded, "isDragging:", isDraggingRef.current);
    console.log("[FloatingApp] handleClick - appWindow:", !!appWindow, "menuRef:", !!menuRef.current);
    if (expanded) {
      console.log("[FloatingApp] handleClick: expanded is true, returning early");
      console.log("[FloatingApp] Current window size should be checked here");
      if (appWindow) {
        const size = await appWindow.outerSize();
        console.log("[FloatingApp] Actual window size:", size.width, size.height);
      }
      return;
    }
    if (isDraggingRef.current) {
      console.log("[FloatingApp] handleClick: isDragging is true, returning early");
      return;
    }
    console.log("[FloatingApp] Calling toggleMenu...");
    await toggleMenu();
    console.log("[FloatingApp] toggleMenu done, expanded is now:", expanded);
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

    setExpandedWithTrace(false);
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

  // 组件首次挂载日志
  useEffect(() => {
    console.log("[FloatingApp] Component mounted, initial expanded:", expanded);
  }, []);

  useEffect(() => {
    if (!appWindow) return;
    void appWindow.setAlwaysOnTop(true);
    void appWindow.setSkipTaskbar(true);
  }, [appWindow]);

  // 监听窗口显示事件，重置状态
  useEffect(() => {
    if (!appWindow) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      // 监听托盘发送的重置事件
      unlisten = await appWindow.listen("tray:reset-pet", () => {
        console.log("[FloatingApp] Received tray:reset-pet event, resetting state");
        setExpanded(false);
        setPetState("idle");
        setContextMenuVisible(false);
      });
    };

    void setup();

    return () => {
      unlisten?.();
    };
  }, [appWindow]);

  useEffect(() => {
    if (!expanded && !contextMenuVisible) return;

    let cleanup: (() => void) | null = null;
    const initTimer = setTimeout(() => {
      const handlePointer = (event: PointerEvent) => {
        const target = event.target as HTMLElement;
        if (ballRef.current?.contains(target)) return;
        if (expanded && menuRef.current?.contains(target)) return;
        if (contextMenuVisible && contextMenuRef.current?.contains(target)) return;

        if (expanded) void collapseMenu();
        if (contextMenuVisible) setContextMenuVisible(false);
      };

      window.addEventListener("pointerdown", handlePointer);
      cleanup = () => window.removeEventListener("pointerdown", handlePointer);
    }, 100);

    return () => {
      clearTimeout(initTimer);
      cleanup?.();
    };
  }, [expanded, contextMenuVisible, collapseMenu]);

  useEffect(() => {
    if (petState !== "idle" || expanded) return;

    const timer = setInterval(() => {
      if (petState === "idle" && !expanded && !showBubble && Math.random() < 0.5) {
        showBubbleMessage(getRandomMessage(petState));
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [petState, expanded, showBubble, showBubbleMessage]);

  useEffect(() => {
    if (!appWindow) return;
    const updateBubblePosition = async () => {
      try {
        const position = await appWindow.outerPosition();
        const bounds = await getMonitorBounds();
        if (bounds) {
          setBubbleOnLeft(position.x > bounds.x + bounds.width - 200);
        }
      } catch {
        // 忽略
      }
    };
    void updateBubblePosition();
  }, [appWindow]);

  // ========== 渲染 ==========

  const ballStyle = expanded ? getExpandedBallStyle(menuPlacement) : getCollapsedBallStyle();

  const getPetStateClassName = () => {
    const classes: string[] = [];
    if (snapping) classes.push("is-snapping");
    if (petState === "dragging") classes.push("is-dragging");
    if (petState === "happy") classes.push("is-happy");
    if (petState === "sleepy") classes.push("is-sleepy");
    return classes.join(" ");
  };

  console.log("[FloatingApp] Rendering, expanded:", expanded, "menuPlacement:", menuPlacement);

  // 检查窗口实际大小
  useEffect(() => {
    console.log("[FloatingApp] useEffect for window size triggered, expanded:", expanded, "appWindow:", !!appWindow);
    if (expanded && appWindow) {
      appWindow.outerSize().then(size => {
        console.log("[FloatingApp] Window size after expanded:", size.width, size.height);
      });
    }
  }, [expanded, appWindow]);

  // 检查菜单元素渲染
  useEffect(() => {
    console.log("[FloatingApp] useEffect for menu element triggered, expanded:", expanded, "menuRef:", !!menuRef.current);
    if (expanded && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      console.log("[FloatingApp] Menu element rect:", rect.width, rect.height, rect.left, rect.top);
      console.log("[FloatingApp] Menu computed style:", window.getComputedStyle(menuRef.current).display);
    }
  }, [expanded]);

  return (
    <div className={`floating-root ${expanded ? "is-expanded" : ""}`}>
      {showBubble && !expanded && (
        <div className={`pet-bubble ${bubbleOnLeft ? "is-left" : ""}`}>
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
        <img src="/claw512.png" alt="AmosClaw" />

        <div className="pet-effects">
          {particles.map((p) => (
            <span
              key={p.id}
              className="particle"
              style={{
                left: p.x,
                top: p.y,
                "--tx": `${p.tx}px`,
                "--ty": `${p.ty}px`,
              } as CSSProperties}
            >
              {p.emoji}
            </span>
          ))}
        </div>

        {petState === "sleepy" && <span className="pet-zzz">💤</span>}
      </button>

      {expanded && (
        <div ref={menuRef} className="floating-menu" style={getMenuStyle(menuPlacement)}>
          <div className="floating-menu-header">
            <div className="floating-menu-title">
              <img src="/claw512.png" alt="AmosClaw" />
              <div>
                <div className="floating-menu-name">AmosClaw</div>
                <div className="floating-menu-subtitle">你的桌面伙伴</div>
              </div>
            </div>
            <div className="floating-menu-header-actions">
              <button className="floating-menu-action" onClick={() => void convertToWindow()} aria-label="窗口化">
                <Maximize2 size={14} />
              </button>
              <button className="floating-menu-action" onClick={() => void collapseMenu()} aria-label="关闭菜单">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="floating-menu-items">
            <button className="floating-menu-item floating-menu-item--pet-action" onClick={() => handleFeed()}>
              <span>🍎</span><span>喂食</span>
            </button>
            <button className="floating-menu-item floating-menu-item--pet-action" onClick={() => handlePlay()}>
              <span>🎾</span><span>玩耍</span>
            </button>
            <button className="floating-menu-item floating-menu-item--pet-action" onClick={() => handleSleep()}>
              <span>💤</span><span>睡觉</span>
            </button>

            <div style={{ height: 1, background: "rgba(148, 163, 184, 0.2)", margin: "4px 0" }} />

            <button className="floating-menu-item" onClick={() => void openMainWindow("/conversation")}>
              <MessageCircle size={18} /><span>新对话</span>
            </button>
            <button className="floating-menu-item" onClick={() => void openMainWindow("/conversation")}>
              <History size={18} /><span>历史记录</span>
            </button>
            <button className="floating-menu-item" onClick={() => void openMainWindow("/system/settings")}>
              <Settings size={18} /><span>设置</span>
            </button>
            <button className="floating-menu-item" onClick={() => void openMainWindow("/")}>
              <LayoutGrid size={18} /><span>打开主界面</span>
            </button>
          </div>

          <div className="floating-menu-footer">
            <button className="floating-menu-item" onClick={() => void exitApp()}>
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
