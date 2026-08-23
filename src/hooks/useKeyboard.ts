/**
 * 键盘快捷键 Hook
 * 提供按键检测和快捷键管理
 */

import { useEffect, useCallback, useRef, useState } from 'react';

// ==================== 类型定义 ====================

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta';
export type KeyHandler = (event: KeyboardEvent) => void;

export interface KeyBinding {
  key: string;
  modifiers?: KeyModifier[];
  handler: KeyHandler;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  description?: string;
}

export interface UseKeyPressOptions {
  target?: HTMLElement | Window | null;
  event?: 'keydown' | 'keyup' | 'keypress';
  preventDefault?: boolean;
}

// ==================== 工具函数 ====================

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * 解析快捷键字符串
 * @example parseKeyString('ctrl+s') => { key: 's', modifiers: ['ctrl'] }
 */
function parseKeyString(keyString: string): { key: string; modifiers: KeyModifier[] } {
  const parts = keyString.toLowerCase().split('+');
  const modifiers: KeyModifier[] = [];
  let key = '';

  for (const part of parts) {
    switch (part) {
      case 'ctrl':
      case 'control':
        modifiers.push('ctrl');
        break;
      case 'alt':
      case 'option':
        modifiers.push('alt');
        break;
      case 'shift':
        modifiers.push('shift');
        break;
      case 'meta':
      case 'cmd':
      case 'command':
        modifiers.push('meta');
        break;
      default:
        key = part;
    }
  }

  return { key, modifiers };
}

/**
 * 检查修饰键是否匹配
 */
function checkModifiers(event: KeyboardEvent, modifiers: KeyModifier[]): boolean {
  return modifiers.every((mod) => {
    switch (mod) {
      case 'ctrl':
        return event.ctrlKey;
      case 'alt':
        return event.altKey;
      case 'shift':
        return event.shiftKey;
      case 'meta':
        return event.metaKey;
      default:
        return false;
    }
  });
}

// ==================== useKeyPress Hook ====================

/**
 * 检测单个按键是否被按下
 * @param targetKey 目标按键
 * @param options Configuration options
 * @returns 是否按下
 */
export function useKeyPress(
  targetKey: string,
  options: UseKeyPressOptions = {}
): boolean {
  const { target = typeof window !== 'undefined' ? window : null } = options;

  const [keyPressed, setKeyPressed] = useState(false);

  const downHandler = useCallback(
    (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key.toLowerCase() === targetKey.toLowerCase()) {
        setKeyPressed(true);
      }
    },
    [targetKey]
  );

  const upHandler = useCallback(
    (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key.toLowerCase() === targetKey.toLowerCase()) {
        setKeyPressed(false);
      }
    },
    [targetKey]
  );

  useEffect(() => {
    if (!target) return;

    target.addEventListener('keydown', downHandler);
    target.addEventListener('keyup', upHandler);

    return () => {
      target.removeEventListener('keydown', downHandler);
      target.removeEventListener('keyup', upHandler);
    };
  }, [target, downHandler, upHandler]);

  return keyPressed;
}

// ==================== useKeyBinding Hook ====================

/**
 * 绑定单个快捷键
 * @param keyString 快捷键字符串，e.g. 'ctrl+s'
 * @param callback 回调函数
 * @param options Configuration options
 */
export function useKeyBinding(
  keyString: string,
  callback: KeyHandler,
  options: {
    enabled?: boolean;
    preventDefault?: boolean;
    stopPropagation?: boolean;
    description?: string;
  } = {}
): void {
  const { enabled = true, preventDefault = true, stopPropagation = false } = options;
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const { key, modifiers } = parseKeyString(keyString);

    const handler = (event: KeyboardEvent) => {
      // 检查按键和修饰键
      if (
        event.key.toLowerCase() === key &&
        checkModifiers(event, modifiers)
      ) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        callbackRef.current(event);
      }
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [keyString, enabled, preventDefault, stopPropagation]);
}

// ==================== useHotkeys Hook ====================

/**
 * 管理多个快捷键
 * @param bindings 快捷键绑定数组
 * @param options Configuration options
 */
export function useHotkeys(
  bindings: KeyBinding[],
  options: { enabled?: boolean } = {}
): void {
  const { enabled = true } = options;
  const bindingsRef = useRef(bindings);

  useEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      for (const binding of bindingsRef.current) {
        const { key, modifiers = [], handler: bindingHandler, preventDefault = true, stopPropagation = false } = binding;

        if (
          event.key.toLowerCase() === key.toLowerCase() &&
          checkModifiers(event, modifiers)
        ) {
          if (preventDefault) {
            event.preventDefault();
          }
          if (stopPropagation) {
            event.stopPropagation();
          }
          bindingHandler(event);
          break; // 只触发第一个匹配的快捷键
        }
      }
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [enabled]);
}

// ==================== useKeyboardState Hook ====================

export interface KeyboardState {
  /** 当前按下的键 */
  pressedKeys: Set<string>;
  /** 是否按下 Ctrl */
  ctrlKey: boolean;
  /** 是否按下 Alt */
  altKey: boolean;
  /** 是否按下 Shift */
  shiftKey: boolean;
  /** 是否按下 Meta/Cmd */
  metaKey: boolean;
}

/**
 * 获取键盘状态
 * @returns 键盘状态
 */
export function useKeyboardState(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    pressedKeys: new Set(),
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setState((prev) => ({
        pressedKeys: new Set(prev.pressedKeys).add(event.key.toLowerCase()),
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
      }));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setState((prev) => {
        const newPressedKeys = new Set(prev.pressedKeys);
        newPressedKeys.delete(event.key.toLowerCase());
        return {
          pressedKeys: newPressedKeys,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
        };
      });
    };

    const handleBlur = () => {
      setState({
        pressedKeys: new Set(),
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return state;
}

// ==================== 预设快捷键 ====================

/**
 * 常用快捷键预设
 */
export const HOTKEY_PRESETS = {
  // 通用
  SAVE: isMac ? 'meta+s' : 'ctrl+s',
  COPY: isMac ? 'meta+c' : 'ctrl+c',
  PASTE: isMac ? 'meta+v' : 'ctrl+v',
  CUT: isMac ? 'meta+x' : 'ctrl+x',
  UNDO: isMac ? 'meta+z' : 'ctrl+z',
  REDO: isMac ? 'meta+shift+z' : 'ctrl+shift+z',
  SELECT_ALL: isMac ? 'meta+a' : 'ctrl+a',

  // 导航
  SEARCH: isMac ? 'meta+k' : 'ctrl+k',
  GO_HOME: isMac ? 'meta+Home' : 'ctrl+Home',
  GO_END: isMac ? 'meta+End' : 'ctrl+End',

  // 其他
  ESCAPE: 'escape',
  ENTER: 'enter',
  TAB: 'tab',
  SPACE: ' ',
  ARROW_UP: 'arrowup',
  ARROW_DOWN: 'arrowdown',
  ARROW_LEFT: 'arrowleft',
  ARROW_RIGHT: 'arrowright',
} as const;

export default {
  useKeyPress,
  useKeyBinding,
  useHotkeys,
  useKeyboardState,
  HOTKEY_PRESETS,
};
