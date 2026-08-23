/**
 * Multi-tab管理组件
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

// ==================== 类型定义 ====================

export interface TabItem {
  /** 唯一标识 */
  key: string;
  /** LabelTitle */
  label: React.ReactNode;
  /** 是否可关闭 */
  closable?: boolean;
  /** 图标 */
  icon?: React.ReactNode;
  /** 是否固定 */
  fixed?: boolean;
}

export interface MultiTabContextType {
  /** 当前Tabs列表 */
  tabs: TabItem[];
  /** 当前激活的Label */
  activeKey: string;
  /** 添加Label */
  addTab: (tab: TabItem) => void;
  /** 关闭Label */
  closeTab: (key: string) => void;
  /** 关闭其他Label */
  closeOthersTab: (key: string) => void;
  /** 关闭所有Label */
  closeAll: () => void;
  /** 关闭左侧Label */
  closeLeft: (key: string) => void;
  /** 关闭右侧Label */
  closeRight: (key: string) => void;
  /** 刷新Label */
  refreshTab: (key: string) => void;
  /** 设置激活Label */
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
  /** 初始Tabs */
  initialTabs?: TabItem[];
  /** 默认激活的Label */
  defaultActiveKey?: string;
  /** 最大Label数量 */
  maxTabs?: number;
  /** Label变化回调 */
  onTabsChange?: (tabs: TabItem[], activeKey: string) => void;
  /** Label关闭回调 */
  onClose?: (key: string) => void;
  /** Label刷新回调 */
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
        // 检查是否已存在
        const exists = prev.some((t) => t.key === tab.key);
        if (exists) {
          return prev;
        }

        // 检查是否超过最大数量
        if (prev.length >= maxTabs) {
          // 移除第一个可关闭的Label
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

        // 检查是否可关闭
        if (tab && tab.closable === false) {
          return prev;
        }

        const newTabs = prev.filter((t) => t.key !== key);

        // e.g.果关闭的是当前激活的Label，激活相邻Label
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

  // 触发变化回调
  React.useEffect(() => {
    onTabsChange?.(tabs, activeKey);
  }, [tabs, activeKey, onTabsChange]);

  return (
    <MultiTabContext.Provider value={contextValue}>
      {children}
    </MultiTabContext.Provider>
  );
};

// ==================== Multi-tab视图组件 ====================

export interface MultiTabViewProps {
  /** Tabs样式 */
  tabStyle?: "card" | "line";
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 是否显示关闭按钮 */
  showClose?: boolean;
  /** 额外操作 */
  extra?: React.ReactNode;
  /** 类名 */
  className?: string;
}

export const MultiTabView: React.FC<MultiTabViewProps> = ({
  showRefresh = true,
  showClose = true,
  extra,
  className = "",
}) => {
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

  // 右键菜单
  const getContextMenu = (key: string): MenuProps["items"] => {
    return [
      {
        key: "refresh",
        icon: <ReloadOutlined />,
        label: "刷新",
        onClick: () => refreshTab(key),
      },
      { type: "divider" },
      {
        key: "close",
        icon: <CloseOutlined />,
        label: "关闭",
        disabled: tabs.find((t) => t.key === key)?.closable === false,
        onClick: () => closeTab(key),
      },
      {
        key: "closeOthers",
        icon: <CloseCircleOutlined />,
        label: "关闭其他",
        onClick: () => closeOthersTab(key),
      },
      { type: "divider" },
      {
        key: "closeLeft",
        icon: <VerticalLeftOutlined />,
        label: "关闭左侧",
        onClick: () => closeLeft(key),
      },
      {
        key: "closeRight",
        icon: <VerticalRightOutlined />,
        label: "关闭右侧",
        onClick: () => closeRight(key),
      },
      { type: "divider" },
      {
        key: "closeAll",
        icon: <CloseCircleOutlined />,
        label: "关闭所有",
        onClick: () => closeAll(),
      },
    ];
  };

  // 渲染Label
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

      {/* 额外操作 */}
      {extra && <div className="flex items-center gap-2">{extra}</div>}

      {/* 刷新按钮 */}
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
