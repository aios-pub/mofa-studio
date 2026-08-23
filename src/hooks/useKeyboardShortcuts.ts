/**
 * 全局快捷键管理 Hook
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores';

// 快捷键定义
export interface ShortcutDefinition {
  id: string;
  keys: string[]; // e.g., ['meta', 'n'] for Cmd+N
  description: string;
  category: 'navigation' | 'actions' | 'view' | 'editor';
  action: () => void;
  enabled?: () => boolean;
}

// 检查事件是否匹配快捷键
function matchesShortcut(event: KeyboardEvent, keys: string[]): boolean {
  // 检查 event.key 是否存在
  if (!event?.key) return false;

  const pressedKeys: string[] = [];

  if (event.metaKey || event.ctrlKey) {
    pressedKeys.push('meta');
  }
  if (event.altKey) {
    pressedKeys.push('alt');
  }
  if (event.shiftKey) {
    pressedKeys.push('shift');
  }

  // 添加主键
  const mainKey = event.key.toLowerCase();
  if (!['meta', 'control', 'alt', 'shift'].includes(mainKey)) {
    pressedKeys.push(mainKey);
  }

  // 比较按键
  if (pressedKeys.length !== keys.length) return false;

  return keys.every((key) => pressedKeys.includes(key));
}

// 格式化快捷键显示
export function formatShortcut(keys: string[]): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return keys
    .map((key) => {
      if (!key) return '';
      switch (key.toLowerCase()) {
        case 'meta':
          return isMac ? '⌘' : 'Ctrl';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'shift':
          return isMac ? '⇧' : 'Shift';
        case 'enter':
          return '↵';
        case 'escape':
          return 'Esc';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        case 'backspace':
          return '⌫';
        case 'delete':
          return '⌦';
        default:
          return key.toUpperCase();
      }
    })
    .filter(Boolean)
    .join(' + ');
}

// 全局快捷键 Hook
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { toggleSidebar } = useAppStore();
  const shortcutsRef = useRef<ShortcutDefinition[]>([]);

  // 定义快捷键
  const shortcuts: ShortcutDefinition[] = [
    // 导航类
    {
      id: 'nav-dashboard',
      keys: ['meta', '1'],
      description: 'Go to Dashboard',
      category: 'navigation',
      action: () => navigate('/'),
    },
    {
      id: 'nav-conversation',
      keys: ['meta', '2'],
      description: 'Go to Conversation',
      category: 'navigation',
      action: () => navigate('/conversation'),
    },
    {
      id: 'nav-agents',
      keys: ['meta', '3'],
      description: 'Go to Agent Management',
      category: 'navigation',
      action: () => navigate('/management/agents'),
    },
    {
      id: 'nav-analytics',
      keys: ['meta', '4'],
      description: 'Go to Analytics',
      category: 'navigation',
      action: () => navigate('/analytics'),
    },
    {
      id: 'nav-settings',
      keys: ['meta', ','],
      description: 'Open Settings',
      category: 'navigation',
      action: () => navigate('/system/settings'),
    },

    // 视图类
    {
      id: 'toggle-sidebar',
      keys: ['meta', 'b'],
      description: 'Toggle Sidebar',
      category: 'view',
      action: toggleSidebar,
    },

    // 操作类
    {
      id: 'new-conversation',
      keys: ['meta', 'n'],
      description: 'New Conversation',
      category: 'actions',
      action: () => {
        // 触发新建对话事件
        window.dispatchEvent(new CustomEvent('shortcut:newConversation'));
      },
    },
    {
      id: 'search',
      keys: ['meta', 'k'],
      description: 'Quick Search',
      category: 'actions',
      action: () => {
        window.dispatchEvent(new CustomEvent('shortcut:search'));
      },
    },
    {
      id: 'refresh',
      keys: ['meta', 'r'],
      description: 'Refresh Current Page',
      category: 'actions',
      action: () => {
        window.dispatchEvent(new CustomEvent('shortcut:refresh'));
      },
    },

    // 编辑器类
    {
      id: 'send-message',
      keys: ['meta', 'enter'],
      description: 'Send Message',
      category: 'editor',
      action: () => {
        window.dispatchEvent(new CustomEvent('shortcut:sendMessage'));
      },
    },
    {
      id: 'new-line',
      keys: ['enter'],
      description: 'New Line (in input)',
      category: 'editor',
      action: () => {
        // 默认行为，不需要处理
      },
      enabled: () => false, // 只在输入框中生效
    },
  ];

  // 更新 ref
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 检查是否在输入框中
      const target = event.target as HTMLElement;
      const isInputting =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        if (matchesShortcut(event, shortcut.keys)) {
          // 检查Whether to enable
          if (shortcut.enabled && !shortcut.enabled()) {
            continue;
          }

          // 在输入框中时，只允许特定快捷键
          if (isInputting) {
            // Cmd/Ctrl 修饰的快捷键在输入框中仍然生效
            const isMetaShortcut = shortcut.keys.includes('meta') || shortcut.keys.includes('control');

            if (!isMetaShortcut && shortcut.category !== 'navigation') {
              continue;
            }
          }

          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    []
  );

  // 注册全局事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts,
    formatShortcut,
  };
}

// 获取所有快捷键定义（用于设置页面展示）
export function getShortcutDefinitions(): Array<{
  category: string;
  shortcuts: Array<{ keys: string[]; description: string }>;
}> {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const metaKey = isMac ? '⌘' : 'Ctrl';

  return [
    {
      category: 'Navigation',
      shortcuts: [
        { keys: [metaKey, '1'], description: 'Go to Dashboard' },
        { keys: [metaKey, '2'], description: 'Go to Conversation' },
        { keys: [metaKey, '3'], description: 'Go to Agent Management' },
        { keys: [metaKey, '4'], description: 'Go to Analytics' },
        { keys: [metaKey, ','], description: 'Open Settings' },
      ],
    },
    {
      category: 'View',
      shortcuts: [{ keys: [metaKey, 'B'], description: 'Toggle Sidebar' }],
    },
    {
      category: 'Actions',
      shortcuts: [
        { keys: [metaKey, 'N'], description: 'New Conversation' },
        { keys: [metaKey, 'K'], description: 'Quick Search' },
        { keys: [metaKey, 'R'], description: 'Refresh Page' },
      ],
    },
    {
      category: 'Editor',
      shortcuts: [{ keys: [metaKey, 'Enter'], description: 'Send Message' }],
    },
  ];
}
