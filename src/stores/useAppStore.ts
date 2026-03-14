/**
 * 应用全局状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, WindowMode } from '../types';

export type SupportedLanguage = 'zh-CN' | 'en-US';

interface AppState {
  // 主题
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // 语言
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;

  // 窗口模式 (悬浮球相关)
  windowMode: WindowMode;
  setWindowMode: (mode: WindowMode) => void;

  // 侧边栏状态
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // 当前选中的 Agent ID
  currentAgentId: string | null;
  setCurrentAgentId: (id: string | null) => void;

  // 当前选中的会话 ID
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 主题
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // 语言
      language: 'zh-CN',
      setLanguage: (language) => set({ language }),

      // 窗口模式
      windowMode: 'full',
      setWindowMode: (windowMode) => set({ windowMode }),

      // 侧边栏
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      // 当前 Agent
      currentAgentId: null,
      setCurrentAgentId: (currentAgentId) => set({ currentAgentId }),

      // 当前会话
      currentConversationId: null,
      setCurrentConversationId: (currentConversationId) => set({ currentConversationId }),
    }),
    {
      name: 'amos-claw-app-store',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        windowMode: state.windowMode,
      }),
    }
  )
);
