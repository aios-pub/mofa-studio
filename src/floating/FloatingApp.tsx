import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";import {
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

// Idle bubble trigger interval range (milliseconds)
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

// The core window-plugin IPC path deadlocks on macOS for the pet window
// shape (upstream tauri#14822), so window state is driven through the
// native pet_* commands; reads are time-boxed to stay responsive even if
// the main thread wedges.
const IPC_TIMEOUT_MS = 800;

const withTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((resolve) =>
      setTimeout(() => resolve(fallback), IPC_TIMEOUT_MS),
    ),
  ]);

type PetFramePayload = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PetEnvPayload = {
  frame: PetFramePayload;
  monitor: PetFramePayload | null;
  scale: number;
};

const petCall = async <T,>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T | undefined> => {
  if (!isTauriApp()) return undefined;
  try {
    return await withTimeout(invoke<T>(cmd, args ?? {}), undefined as T);
  } catch (e) {
    console.error(`[FloatingApp] ${cmd} failed:`, e);
    return undefined;
  }
};

const getPetEnv = async (): Promise<PetEnvPayload | undefined> => {
  // One retry: pet_env hops to the main thread and can outlive the 800ms
  // budget while a window transition is in flight; a single retry has been
  // enough in practice and beats blind-falling back to a default position.
  return (await petCall<PetEnvPayload>("pet_env")) ?? (await petCall<PetEnvPayload>("pet_env"));
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

export default function FloatingApp() {  const { t } = useTranslation();

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

  // Dragging uses the native window-drag session: WebKit drives the move at
  // display refresh rate (buttery), while the protections below keep it
  // well-behaved — no HTML5 image-drag ghost, click suppressed after
  // release, and a post-release snap that always re-enters the screen.
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const ballRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const isMouseDownRef = useRef(false);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A mouseup at the end of a drag still produces a browser click; without
  // suppression that click opens the menu immediately after every drag.
  const suppressClickUntilRef = useRef(0);
  const particleIdRef = useRef(0);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleBubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track expanded in a ref to avoid showBubbleMessage rebuilding on expanded changes
  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // ========== Helpers ==========

  const updateBubblePlacement = useCallback(async () => {
    const env = await getPetEnv();
    if (!env?.monitor) return;
    setBubbleOnLeft(env.frame.x > env.monitor.x + env.monitor.width / 2);
  }, []);

  const showBubbleMessage = useCallback(
    (message: string, duration = 4000) => {
      if (bubbleTimeoutRef.current) {
        clearTimeout(bubbleTimeoutRef.current);
      }
      // Only update direction by screen position when collapsed; menuPlacement decides when expanded
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

  // ========== Idle bubble timer ==========

  useEffect(() => {
    // Clear old timers
    if (idleBubbleTimerRef.current) {
      clearTimeout(idleBubbleTimerRef.current);
      idleBubbleTimerRef.current = null;
    }

    // Periodically show idle bubbles only when the menu is collapsed and state is idle
    if (expanded || petState !== "idle") return;

    const scheduleNextBubble = () => {
      const delay =
        IDLE_BUBBLE_MIN_INTERVAL +
        Math.random() * (IDLE_BUBBLE_MAX_INTERVAL - IDLE_BUBBLE_MIN_INTERVAL);

      idleBubbleTimerRef.current = setTimeout(() => {
        // Trigger idle bubbles with getRandomMessage
        const message = getRandomMessage("idle");
        showBubbleMessage(message, 4000);
        // Schedule the next run recursively
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

  // ========== Window operations ==========

  const snapToEdge = useCallback(async () => {
    if (!appWindow) return;

    const env = await getPetEnv();
    // The monitor is null whenever the ball centre left every display
    // (dragged past an edge), which is exactly when the snap matters most —
    // fall back to the JS screen object so release ALWAYS pulls the ball
    // back on-screen instead of stranding it off-screen.
    const bounds = env?.monitor ?? {
      x: 0,
      y: 0,
      width: window.screen.width,
      height: window.screen.height,
    };
    const position = env
      ? { x: env.frame.x, y: env.frame.y }
      : {
          x: window.screen.width - BALL_SIZE - 50,
          y: Math.round(window.screen.height / 2 - BALL_SIZE / 2),
        };
    const size = env?.frame ?? { width: BALL_SIZE, height: BALL_SIZE };

    let targetX = position.x;
    let targetY = position.y;

    if (bounds) {
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

      await petCall("pet_set_frame", {
        x: currentX,
        y: currentY,
        width: size.width,
        height: size.height,
      });

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
    const env = await getPetEnv();
    // env can time out under main-thread pressure; the synchronous window
    // origin keeps placement math grounded instead of teleporting to (0,0).
    const logicalPos = env
      ? { x: env.frame.x, y: env.frame.y }
      : { x: window.screenX, y: window.screenY };
    const bounds = env?.monitor
      ? {
          x: env.monitor.x,
          y: env.monitor.y,
          width: env.monitor.width,
          height: env.monitor.height,
        }
      : null;
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
      await petCall("pet_set_frame", { x: nextX, y: nextY, width, height });
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

    // Clear visible bubbles when collapsing to avoid position jumps
    setShowBubble(false);
    if (bubbleTimeoutRef.current) {
      clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = null;
    }

    setExpanded(false);
    // window.screenX/Y is a synchronous read of the live window origin — no
    // IPC hop, so collapsing never depends on a timed pet_env succeeding.
    await petCall("pet_set_frame", {
      x: window.screenX,
      y: window.screenY,
      width: BALL_SIZE,
      height: BALL_SIZE,
    });
  }, [appWindow]);

  const toggleMenu = useCallback(async () => {
    if (expanded) {
      await collapseMenu();
    } else {
      await expandMenu();
    }
  }, [expanded, collapseMenu, expandMenu]);

  // ========== Desktop pet interaction ==========

  const handlePlay = useCallback(() => {
    clearStateTimeout();
    setPetState("happy");
    setIsSpinning(true);
    spawnParticles("✨", 6);
    spawnParticles("💖", 4);
    // Use getRandomMessage instead of hardcoding
    showBubbleMessage(getRandomMessage("happy"), 2500);
    setTimeout(() => setIsSpinning(false), 600);
    stateTimeoutRef.current = setTimeout(() => setPetState("idle"), 2500);
  }, [spawnParticles, showBubbleMessage, clearStateTimeout]);

  const handleSleep = useCallback(() => {
    clearStateTimeout();
    setPetState("sleepy");
    // Use getRandomMessage
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
    // Use getRandomMessage
    showBubbleMessage(getRandomMessage("happy"), 2500);
    stateTimeoutRef.current = setTimeout(() => setPetState("idle"), 2500);
  }, [spawnParticles, showBubbleMessage, clearStateTimeout]);

  // ========== Event handling ==========

  const DRAG_THRESHOLD_PX = 15;
  const DRAG_HOLD_MS = 300;

  const enterDraggingState = () => {
    isDraggingRef.current = true;
    setPetState("dragging");
    // Show dragging message while dragging
    showBubbleMessage(getRandomMessage("dragging"), 3000);
  };

  const handlePointerDown = (event: ReactPointerEvent) => {
    if (!appWindow || expanded || event.button !== 0) return;

    isDraggingRef.current = false;
    isMouseDownRef.current = true;
    dragStartRef.current = { x: event.clientX, y: event.clientY };

    // Hold in place for a moment → treat as drag start.
    dragTimerRef.current = setTimeout(() => {
      if (isMouseDownRef.current && !isDraggingRef.current) {
        enterDraggingState();
        void petCall("start_window_drag");
      }
    }, DRAG_HOLD_MS);
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    if (!appWindow || expanded || !isMouseDownRef.current) return;

    const start = dragStartRef.current;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX && !isDraggingRef.current) {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      enterDraggingState();
      void petCall("start_window_drag");
    }
  };

  const handlePointerUp = async () => {
    if (!appWindow || expanded) return;

    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;
    isMouseDownRef.current = false;
    dragStartRef.current = null;

    if (wasDragging) {
      setPetState("idle");
      setShowBubble(false);
      suppressClickUntilRef.current = Date.now() + 350;
      await snapToEdge();
    }
  };

  const handleClick = async () => {
    if (expanded) return;
    if (isDraggingRef.current) return;
    if (Date.now() < suppressClickUntilRef.current) return;
    await toggleMenu();
  };

  const handleDoubleClick = async () => {
    if (expanded) return;
    if (Date.now() < suppressClickUntilRef.current) return;
    isDraggingRef.current = false;
    isMouseDownRef.current = false;
    await toggleMenu();
  };

  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    if (expanded) return;
    setContextMenuVisible(true);
  };

  // ========== Other actions ==========

  const toggleAlwaysOnTop = async () => {
    const newValue = !alwaysOnTop;
    setAlwaysOnTop(newValue);
    await petCall("pet_window_op", { op: "always_on_top", value: newValue });
  };

  const openMainWindow = async (path?: string) => {
    await petCall("pet_window_op", { op: "show_main" });
    if (path) {
      // Best-effort navigation hint; the main window opens regardless.
      void (async () => {
        try {
          const mainWindow = await Window.getByLabel("main");
          await mainWindow?.emit("floating:navigate", { path });
        } catch {
          // Ignore navigation hint failures
        }
      })();
    }

    await collapseMenu();
    await petCall("pet_window_op", { op: "hide" });
  };

  const convertToWindow = async () => {
    if (!appWindow) return;

    await petCall("pet_window_op", { op: "show_main" });
    setExpanded(false);
    await petCall("pet_set_frame", {
      x: window.screenX,
      y: window.screenY,
      width: BALL_SIZE,
      height: BALL_SIZE,
    });
    await petCall("pet_window_op", { op: "hide" });
  };

  const exitApp = async () => {
    await petCall("pet_exit");
  };

  const handleQuickInput = async (message: string) => {
    await petCall("pet_window_op", { op: "show_main" });
    void (async () => {
      try {
        const mainWindow = await Window.getByLabel("main");
        await mainWindow?.emit("floating:quick-message", { message });
      } catch {
        // Best-effort message forwarding
      }
    })();

    await collapseMenu();
    await petCall("pet_window_op", { op: "hide" });
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

        // Show first: orderOut preserves the pre-hide frame, so re-showing
        // alone restores the last position without depending on a timed
        // frame read succeeding. Only reposition on hard evidence that the
        // ball ended up off-screen — never blind-move to (0,0).
        await petCall("pet_window_op", { op: "show" });
        await petCall("pet_window_op", { op: "focus" });

        const env = await getPetEnv();
        const frame = env?.frame;
        // monitor is null whenever the ball centre sits off-screen (e.g. it
        // was dragged below the display) — fall back to the JS screen object
        // so recovery never bails out and strands the ball off-screen.
        const monitor =
          env?.monitor ??
          {
            x: 0,
            y: 0,
            width: window.screen.width,
            height: window.screen.height,
          };

        // Off-screen means the ball CENTRE is outside the display. An
        // edge-equality like frame.y === monitor.height must count as off.
        const isOffScreen =
          !frame ||
          frame.x + BALL_SIZE / 2 < monitor.x ||
          frame.x + BALL_SIZE / 2 > monitor.x + monitor.width ||
          frame.y + BALL_SIZE / 2 < monitor.y ||
          frame.y + BALL_SIZE / 2 > monitor.y + monitor.height;

        if (isOffScreen) {
          await petCall("pet_set_frame", {
            x: monitor.x + monitor.width - BALL_SIZE - 50,
            y: monitor.y + Math.round(monitor.height / 2 - BALL_SIZE / 2),
            width: BALL_SIZE,
            height: BALL_SIZE,
          });
        }
      });
    };

    void setup();
    return () => unlisten?.();
  }, [appWindow]);

  // Show a welcome bubble on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      showBubbleMessage("你好呀! 👋", 3000);
    }, 2000);
    return () => clearTimeout(timer);
  }, [showBubbleMessage]);

  // Clear all timers
  useEffect(() => {
    return () => {
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
      if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
      if (idleBubbleTimerRef.current) clearTimeout(idleBubbleTimerRef.current);
    };
  }, []);

  // ========== Rendering ==========

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

  // When expanded, bubble direction follows menu placement; screen position when collapsed
  // The bubble must face the menu side (where there is space in the window), otherwise it gets clipped
  const effectiveBubbleOnLeft = expanded
    ? menuPlacement.horizontal === "left"
    : bubbleOnLeft;

  // When expanded, position the bubble inline next to the ball and above the menu to avoid covering menu actions
  const bubblePositionStyle: CSSProperties | undefined = expanded
    ? {
        position: "absolute",
        zIndex: 100,
        pointerEvents: "none",
        // Vertical: aligned with the ball
        ...(menuPlacement.vertical === "down"
          ? { top: 14 }
          : { bottom: 14, top: "auto" }),
        // Horizontal: flush with the menu side of the ball
        ...(menuPlacement.horizontal === "right"
          ? { left: BALL_SIZE + 8, right: "auto" }
          : { right: BALL_SIZE + 8, left: "auto" }),
      }
    : undefined;

  return (
    <div className={`floating-root ${expanded ? "is-expanded" : ""}`}>
      {/* NOTE: removed the !expanded condition so bubbles also show when expanded */}
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
        // WebKit starts an HTML5 image-drag (ghost sprite follows the
        // cursor) whenever the native window-drag session is a tick late;
        // abort that path at the source.
        onDragStart={(event) => event.preventDefault()}
        aria-label={expanded ? "收起菜单" : "展开菜单"}
      >
        <img src="/mofa512.png" alt="mofa-studio" draggable={false} />

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
                <img src="/mofa512.png" alt="mofa-studio" draggable={false} />
              <div>
                <div className="floating-menu-name">mofa-studio</div>
                <div className="floating-menu-subtitle">{t("你的桌面伙伴")}</div>
              </div>
            </div>
            <div className="floating-menu-header-actions">
              <button
                className="floating-menu-action"
                onClick={() => void convertToWindow()}
                aria-label={t("窗口化")}
              >
                <Maximize2 size={14} />
              </button>
              <button
                className="floating-menu-action"
                onClick={() => void collapseMenu()}
                aria-label={t("关闭菜单")}
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
              <span>{t("喂食")}</span>
            </button>
            <button
              className="floating-menu-item floating-menu-item--pet-action"
              onClick={() => handlePlay()}
            >
              <span>🎾</span>
              <span>{t("玩耍")}</span>
            </button>
            <button
              className="floating-menu-item floating-menu-item--pet-action"
              onClick={() => handleSleep()}
            >
              <span>💤</span>
              <span>{t("睡觉")}</span>
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
              <span>{t("新对话")}</span>
            </button>
            <button
              className="floating-menu-item"
              onClick={() => void openMainWindow("/conversation")}
            >
              <History size={18} />
              <span>{t("历史记录")}</span>
            </button>
            <button
              className="floating-menu-item"
              onClick={() => void openMainWindow("/system/settings")}
            >
              <Settings size={18} />
              <span>{t("设置")}</span>
            </button>
            <button
              className="floating-menu-item"
              onClick={() => void openMainWindow("/")}
            >
              <LayoutGrid size={18} />
              <span>{t("打开主界面")}</span>
            </button>
          </div>

          <div className="floating-menu-footer">
            <button
              className="floating-menu-item"
              onClick={() => void exitApp()}
            >
              <span>{t("👋 退出应用")}</span>
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
