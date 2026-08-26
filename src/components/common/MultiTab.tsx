import { useTranslation } from "react-i18next";
/**
 * Multi-tab management component
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Dropdown, Button } from "antd";
import type { TabsProps } from "antd";
import {
  CloseOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

// ==================== Type definitions ====================

export interface TabItem {
  /** Unique identifier */
  key: string;
  /** LabelTitle */
  label: React.ReactNode;
  /** Closable */
  closable?: boolean;
  /** Icon */
  icon?: React.ReactNode;
  /** Whether fixed */
  fixed?: boolean;
}

export interface MultiTabContextType {
  /** Current tab list */
  tabs: TabItem[];
  /** Currently active tab */
  activeKey: string;
  /** Add tab */
  addTab: (tab: TabItem) => void;
  /** Close tab */
  closeTab: (key: string) => void;
  /** Close other tabs */
  closeOthersTab: (key: string) => void;
  /** Close all tabs */
  closeAll: () => void;
  /** Close tabs to the left */
  closeLeft: (key: string) => void;
  /** Close tabs to the right */
  closeRight: (key: string) => void;
  /** Refresh tab */
  refreshTab: (key: string) => void;
  /** Set the active tab */
  setActiveKey: (key: string) => void;
}

// ==================== Context ====================

const MultiTabContext = createContext<MultiTabContextType | null>(null);

export const useMultiTab = () => {
  const context = useContext(MultiTabContext);
  if (!context) {
    throw new Error("useMultiTab must be used within MultiTabProvider");
  }
  return context;
};

// ==================== Provider ====================

export interface MultiTabProviderProps {
  children: React.ReactNode;
  /** Initial tabs */
  initialTabs?: TabItem[];
  /** Default active tab */
  defaultActiveKey?: string;
  /** Maximum tab count */
  maxTabs?: number;
  /** Tab change callback */
  onTabsChange?: (tabs: TabItem[], activeKey: string) => void;
  /** Tab close callback */
  onClose?: (key: string) => void;
  /** Tab refresh callback */
  onRefresh?: (key: string) => void;
}

export const MultiTabProvider: React.FC<MultiTabProviderProps> = ({
  children,
  initialTabs = [],
  defaultActiveKey,
  maxTabs = 20,
  onTabsChange,
  onClose,
  onRefresh,
}) => {
  const [tabs, setTabs] = useState<TabItem[]>(initialTabs);
  const [activeKey, setActiveKey] = useState<string>(defaultActiveKey || "");

  const addTab = useCallback(
    (tab: TabItem) => {
      setTabs((prev) => {
        // Check whether it already exists
        const exists = prev.some((t) => t.key === tab.key);
        if (exists) {
          return prev;
        }

        // Check whether the maximum count is exceeded
        if (prev.length >= maxTabs) {
          // Remove the first closable tab
          const closableIndex = prev.findIndex(
            (t) => t.closable !== false && !t.fixed,
          );
          if (closableIndex > -1) {
            const newTabs = [...prev];
            newTabs.splice(closableIndex, 1);
            return [...newTabs, tab];
          }
        }

        return [...prev, tab];
      });

      setActiveKey(tab.key);
    },
    [maxTabs],
  );

  const closeTab = useCallback(
    (key: string) => {
      setTabs((prev) => {
        const index = prev.findIndex((t) => t.key === key);
        const tab = prev[index];

        // Check whether closable
        if (tab && tab.closable === false) {
          return prev;
        }

        const newTabs = prev.filter((t) => t.key !== key);

        // If the closed tab is the active one, activate an adjacent tab
        if (activeKey === key && newTabs.length > 0) {
          const newIndex = Math.min(index, newTabs.length - 1);
          setActiveKey(newTabs[newIndex].key);
        }

        return newTabs;
      });

      onClose?.(key);
    },
    [activeKey, onClose],
  );

  const closeOthersTab = useCallback((key: string) => {
    setTabs((prev) => {
      return prev.filter(
        (t) => t.key === key || t.closable === false || t.fixed,
      );
    });
    setActiveKey(key);
  }, []);

  const closeAll = useCallback(() => {
    setTabs((prev) => prev.filter((t) => t.closable === false || t.fixed));
  }, []);

  const closeLeft = useCallback((key: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.key === key);
      return prev.filter(
        (t, i) => i >= index || t.closable === false || t.fixed,
      );
    });
  }, []);

  const closeRight = useCallback((key: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.key === key);
      return prev.filter(
        (t, i) => i <= index || t.closable === false || t.fixed,
      );
    });
  }, []);

  const refreshTab = useCallback(
    (key: string) => {
      onRefresh?.(key);
    },
    [onRefresh],
  );

  const contextValue = useMemo(
    () => ({
      tabs,
      activeKey,
      addTab,
      closeTab,
      closeOthersTab,
      closeAll,
      closeLeft,
      closeRight,
      refreshTab,
      setActiveKey,
    }),
    [
      tabs,
      activeKey,
      addTab,
      closeTab,
      closeOthersTab,
      closeAll,
      closeLeft,
      closeRight,
      refreshTab,
    ],
  );

  // Trigger change callback
  React.useEffect(() => {
    onTabsChange?.(tabs, activeKey);
  }, [tabs, activeKey, onTabsChange]);

  return (
    <MultiTabContext.Provider value={contextValue}>
      {children}
    </MultiTabContext.Provider>
  );
};

// ==================== Multi-tab view component ====================

export interface MultiTabViewProps {
  /** Tabs styling */
  tabStyle?: "card" | "line";
  /** Whether to show the refresh button */
  showRefresh?: boolean;
  /** Whether to show the close button */
  showClose?: boolean;
  /** Extra actions */
  extra?: React.ReactNode;
  /** Class name */
  className?: string;
}

export const MultiTabView: React.FC<MultiTabViewProps> = ({
  showRefresh = true,
  showClose = true,
  extra,
  className = "",
}) => {  const { t } = useTranslation();

  const {
    tabs,
    activeKey,
    setActiveKey,
    closeTab,
    refreshTab,
    closeOthersTab,
    closeAll,
    closeLeft,
    closeRight,
  } = useMultiTab();

  // Context menu
  const getContextMenu = (key: string): MenuProps["items"] => {
    return [
      {
        key: "refresh",
        icon: <ReloadOutlined />,
        label: t("刷新"),
        onClick: () => refreshTab(key),
      },
      { type: "divider" },
      {
        key: "close",
        icon: <CloseOutlined />,
        label: t("关闭"),
        disabled: tabs.find((t) => t.key === key)?.closable === false,
        onClick: () => closeTab(key),
      },
      {
        key: "closeOthers",
        icon: <CloseCircleOutlined />,
        label: t("关闭其他"),
        onClick: () => closeOthersTab(key),
      },
      { type: "divider" },
      {
        key: "closeLeft",
        icon: <VerticalLeftOutlined />,
        label: t("关闭左侧"),
        onClick: () => closeLeft(key),
      },
      {
        key: "closeRight",
        icon: <VerticalRightOutlined />,
        label: t("关闭右侧"),
        onClick: () => closeRight(key),
      },
      { type: "divider" },
      {
        key: "closeAll",
        icon: <CloseCircleOutlined />,
        label: t("关闭所有"),
        onClick: () => closeAll(),
      },
    ];
  };

  // Render tab
  const renderTab: TabsProps["renderTabBar"] = () => (
    <div
      className={`flex items-center gap-1 px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-(--color-border) ${className}`}
    >
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <Dropdown
              key={tab.key}
              menu={{ items: getContextMenu(tab.key) }}
              trigger={["contextMenu"]}
            >
              <div
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer
                  transition-colors duration-200
                  ${
                    activeKey === tab.key
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-bg-paper)] hover:bg-[var(--color-action-hover)] text-[var(--color-text-primary)]"
                  }
                `}
                onClick={() => setActiveKey(tab.key)}
              >
                {tab.icon && <span className="text-sm">{tab.icon}</span>}
                <span className="text-sm whitespace-nowrap">{tab.label}</span>
                {showClose && tab.closable !== false && (
                  <CloseOutlined
                    className="text-xs opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.key);
                    }}
                  />
                )}
              </div>
            </Dropdown>
          ))}
        </div>
      </div>

      {/* Extra actions */}
      {extra && <div className="flex items-center gap-2">{extra}</div>}

      {/* Refresh button */}
      {showRefresh && activeKey && (
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => refreshTab(activeKey)}
        />
      )}
    </div>
  );

  return (
    <div className="multi-tab-view">
      {tabs.length > 0 && renderTab(null as any, null as any)}
    </div>
  );
};

export default MultiTabProvider;
