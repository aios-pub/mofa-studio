/**
 * Global shortcut management hook
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores';

// Shortcut definitions
export interface ShortcutDefinition {
  id: string;
  keys: string[]; // e.g., ['meta', 'n'] for Cmd+N
  description: string;
  category: 'navigation' | 'actions' | 'view' | 'editor';
  action: () => void;
  enabled?: () => boolean;
}

// Check whether the event matches a shortcut
function matchesShortcut(event: KeyboardEvent, keys: string[]): boolean {
  // Check whether event.key exists
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

  // Add primary keys
  const mainKey = event.key.toLowerCase();
  if (!['meta', 'control', 'alt', 'shift'].includes(mainKey)) {
    pressedKeys.push(mainKey);
  }

  // Compare keys
  if (pressedKeys.length !== keys.length) return false;

  return keys.every((key) => pressedKeys.includes(key));
}

// Format shortcut display
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

// Global shortcut hook
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { toggleSidebar } = useAppStore();
  const shortcutsRef = useRef<ShortcutDefinition[]>([]);

  // Define shortcuts
  const shortcuts: ShortcutDefinition[] = [
    // Navigation class
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

    // View class
    {
      id: 'toggle-sidebar',
      keys: ['meta', 'b'],
      description: 'Toggle Sidebar',
      category: 'view',
      action: toggleSidebar,
    },

    // Action class
    {
      id: 'new-conversation',
      keys: ['meta', 'n'],
      description: 'New Conversation',
      category: 'actions',
      action: () => {
        // Dispatch the new-conversation event
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

    // Editor class
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
        // Default behavior; nothing to do
      },
      enabled: () => false, // only active inside input fields
    },
  ];

  // Update the ref
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Keyboard event handling
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check whether focus is inside an input
      const target = event.target as HTMLElement;
      const isInputting =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        if (matchesShortcut(event, shortcut.keys)) {
          // Check whether enabled
          if (shortcut.enabled && !shortcut.enabled()) {
            continue;
          }

          // Inside inputs, only specific shortcuts are allowed
          if (isInputting) {
            // Cmd/Ctrl-modified shortcuts still work inside input fields
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

  // Register global event listeners
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

// Get all shortcut definitions (for the settings page)
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
