/**
 * Global application state management
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeMode, WindowMode } from "../types";

export type SupportedLanguage = "zh-CN" | "en-US";

interface AppState {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Language
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;

  // Window mode (floating ball related)
  windowMode: WindowMode;
  setWindowMode: (mode: WindowMode) => void;

  // Sidebar state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Currently selected Agent ID
  currentAgentId: string | null;
  setCurrentAgentId: (id: string | null) => void;

  // Currently selected conversation ID
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme
      theme: "system",
      setTheme: (theme) => set({ theme }),

      // Language
      language: "zh-CN",
      setLanguage: (language) => set({ language }),

      // Window mode
      windowMode: "full",
      setWindowMode: (windowMode) => set({ windowMode }),

      // 侧边栏
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      // 当前 Agent
      currentAgentId: null,
      setCurrentAgentId: (currentAgentId) => set({ currentAgentId }),

      // 当前会话
      currentConversationId: null,
      setCurrentConversationId: (currentConversationId) =>
        set({ currentConversationId }),
    }),
    {
      name: "mofa-studio-app-store",
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        windowMode: state.windowMode,
      }),
    },
  ),
);
