/**
 * Settings state management
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeColorPresets =
  | "default"
  | "cyan"
  | "purple"
  | "blue"
  | "orange"
  | "red";

export type ThemeLayout = "vertical" | "horizontal" | "mini";

export type SettingsType = {
  // Theme color presets
  themeColorPresets: ThemeColorPresets;
  // Layout mode
  themeLayout: ThemeLayout;
  // Content stretch
  themeStretch: boolean;
  // Breadcrumb
  breadCrumb: boolean;
  // Multi-tab
  multiTab: boolean;
  // Accordion menu
  accordion: boolean;
  // Dark sidebar
  darkSidebar: boolean;
  // Font size
  fontSize: number;
};

type SettingStore = {
  settings: SettingsType;
  actions: {
    setSettings: (settings: SettingsType) => void;
    resetSettings: () => void;
  };
};

const defaultSettings: SettingsType = {
  themeColorPresets: "default",
  themeLayout: "vertical",
  themeStretch: false,
  breadCrumb: true,
  multiTab: false,
  accordion: false,
  darkSidebar: true,
  fontSize: 14,
};

export const useSettingStore = create<SettingStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      actions: {
        setSettings: (settings) => {
          set({ settings });
        },
        resetSettings: () => {
          set({ settings: defaultSettings });
        },
      },
    }),
    {
      name: "mofa-studio-setting-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);

export const useSettings = () => useSettingStore((state) => state.settings);
export const useSettingActions = () =>
  useSettingStore((state) => state.actions);

export const themeColorPresetsMap: Record<
  ThemeColorPresets,
  {
    lighter: string;
    light: string;
    default: string;
    dark: string;
    darker: string;
  }
> = {
  default: {
    lighter: "#C8FAD6",
    light: "#5BE49B",
    default: "#00A76F",
    dark: "#007867",
    darker: "#004B50",
  },
  cyan: {
    lighter: "#CCF4FE",
    light: "#68CDF9",
    default: "#078DEE",
    dark: "#0351AB",
    darker: "#012972",
  },
  purple: {
    lighter: "#EBD6FD",
    light: "#B985F4",
    default: "#7635DC",
    dark: "#431A9E",
    darker: "#200A69",
  },
  blue: {
    lighter: "#D1E9FC",
    light: "#76B0F1",
    default: "#2065D1",
    dark: "#103996",
    darker: "#061B64",
  },
  orange: {
    lighter: "#FEF4D4",
    light: "#FED680",
    default: "#FDA92D",
    dark: "#B66816",
    darker: "#793908",
  },
  red: {
    lighter: "#FFE3D5",
    light: "#FF9882",
    default: "#FF3030",
    dark: "#B71833",
    darker: "#7A0930",
  },
};
