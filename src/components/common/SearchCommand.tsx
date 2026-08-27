import { useTranslation } from "react-i18next";
/**
 * Search command palette component
 * Supports global search and quick navigation (Cmd/Ctrl + K)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Modal, Input, Tag, Space } from "antd";
import {
  SearchOutlined,
  HistoryOutlined,
  ApiOutlined,
  SettingOutlined,
  UserOutlined,
  DashboardOutlined,
  RobotOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TeamOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

// Search item configuration
const searchItems = [
  // Workbench
  {
    id: "dashboard",
    title: "仪表盘",
    icon: <DashboardOutlined />,
    path: "/",
    category: "工作台",
    keywords: ["dashboard", "home"],
  },
  {
    id: "conversation",
    title: "对话",
    icon: <RobotOutlined />,
    path: "/conversation",
    category: "工作台",
    keywords: ["chat", "conversation"],
  },
  // Management
  {
    id: "agents",
    title: "Agent 管理",
    icon: <RobotOutlined />,
    path: "/management/agents",
    category: "管理",
    keywords: ["agent", "bot"],
  },
  {
    id: "prompts",
    title: "提示词",
    icon: <FileTextOutlined />,
    path: "/management/prompts",
    category: "管理",
    keywords: ["prompt", "template"],
  },
  {
    id: "skills",
    title: "Skills",
    icon: <ApiOutlined />,
    path: "/management/skills",
    category: "管理",
    keywords: ["skill", "tool"],
  },
  {
    id: "test-sets",
    title: "测试集管理",
    icon: <FileTextOutlined />,
    path: "/management/test-sets",
    category: "管理",
    keywords: ["test", "dataset"],
  },
  {
    id: "providers",
    title: "Provider",
    icon: <ApiOutlined />,
    path: "/management/providers",
    category: "管理",
    keywords: ["provider", "api"],
  },
  {
    id: "tasks",
    title: "定时任务",
    icon: <SettingOutlined />,
    path: "/management/tasks",
    category: "管理",
    keywords: ["task", "schedule"],
  },
  // Monitoring
  {
    id: "analytics",
    title: "统计分析",
    icon: <BarChartOutlined />,
    path: "/analytics",
    category: "监控",
    keywords: ["analytics", "stats"],
  },
  {
    id: "monitoring",
    title: "实时监控",
    icon: <ApiOutlined />,
    path: "/monitoring",
    category: "监控",
    keywords: ["monitoring", "realtime"],
  },
  // Tracing and evaluation
  {
    id: "tracing",
    title: "追踪分析",
    icon: <ApiOutlined />,
    path: "/tracing",
    category: "追踪与评估",
    keywords: ["tracing", "trace"],
  },
  {
    id: "evaluation",
    title: "Agent 评估",
    icon: <BarChartOutlined />,
    path: "/evaluation",
    category: "追踪与评估",
    keywords: ["evaluation", "score"],
  },
  // Organization
  {
    id: "users",
    title: "用户管理",
    icon: <TeamOutlined />,
    path: "/organization/users",
    category: "组织",
    keywords: ["user", "member"],
  },
  {
    id: "departments",
    title: "部门管理",
    icon: <TeamOutlined />,
    path: "/organization/departments",
    category: "组织",
    keywords: ["department", "team"],
  },
  // System
  {
    id: "resources",
    title: "资源管理",
    icon: <ApiOutlined />,
    path: "/system/resources",
    category: "系统",
    keywords: ["resource", "api key"],
  },
  {
    id: "audit-logs",
    title: "审计日志",
    icon: <SafetyOutlined />,
    path: "/system/audit-logs",
    category: "系统",
    keywords: ["audit", "log"],
  },
  {
    id: "settings",
    title: "设置",
    icon: <SettingOutlined />,
    path: "/system/settings",
    category: "系统",
    keywords: ["settings", "config"],
  },
  {
    id: "profile",
    title: "个人中心",
    icon: <UserOutlined />,
    path: "/profile",
    category: "系统",
    keywords: ["profile", "account"],
  },
];

interface SearchItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  path: string;
  category: string;
  keywords: string[];
}

export interface SearchCommandProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SearchCommand: React.FC<SearchCommandProps> = ({
  open: controlledOpen,
  onOpenChange,
}) => {  const { t } = useTranslation();

  const [internalOpen, setInternalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();

  // Use controlled or uncontrolled mode
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setInternalOpen(value);
      }
    },
    [onOpenChange],
  );

  // Shortcut listening
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      // ESC to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Reset the search value
  useEffect(() => {
    if (!isOpen) {
      setSearchValue("");
    }
  }, [isOpen]);

  // Filter search results
  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) return searchItems;

    const lowerSearch = searchValue.toLowerCase();
    return searchItems.filter(
      (item: SearchItem) =>
        item.title.toLowerCase().includes(lowerSearch) ||
        item.category.toLowerCase().includes(lowerSearch) ||
        item.keywords?.some((kw) => kw.includes(lowerSearch)),
    );
  }, [searchValue]);

  // Group by type
  const groupedItems = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    filteredItems.forEach((item: SearchItem) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Select item
  const handleSelect = useCallback(
    (item: SearchItem) => {
      // Add to recent searches
      setRecentSearches((prev) => {
        const newSearches = [
          item.id,
          ...prev.filter((id) => id !== item.id),
        ].slice(0, 5);
        return newSearches;
      });

      setIsOpen(false);
      if (item.path) {
        navigate(item.path);
      }
    },
    [navigate, setIsOpen],
  );

  // Get recently searched items
  const recentItems = useMemo(() => {
    return recentSearches
      .map((id) => searchItems.find((item: SearchItem) => item.id === id))
      .filter(Boolean) as SearchItem[];
  }, [recentSearches]);

  return (
    <Modal
      open={isOpen}
      onCancel={() => setIsOpen(false)}
      footer={null}
      width={560}
      centered
      closable={false}
      className="search-command-modal"
      styles={{
        body: { padding: 0 },
      }}
    >
      {/* Search input box */}
      <div className="p-3 border-b border-(--color-border)">
        <Input
          prefix={
            <SearchOutlined className="text-[var(--color-text-tertiary)]" />
          }
          placeholder={t("搜索菜单、页面... (Ctrl+K)")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          size="large"
          variant="borderless"
          autoFocus
        />
      </div>

      {/* Search results or recent searches */}
      <div className="max-h-80 overflow-y-auto">
        {!searchValue.trim() && recentItems.length > 0 ? (
          <>
            <div className="px-4 py-2 text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
              <HistoryOutlined />
              <span>{t("最近搜索")}</span>
            </div>
            <div className="flex flex-col">
              {recentItems.map((item: SearchItem) => (
                <div
                  key={item.id}
                  className="px-4 py-2 cursor-pointer hover:bg-[var(--color-action-hover)] transition-colors"
                  onClick={() => handleSelect(item)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        {item.category}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)]">
                {category}
              </div>
              <div className="flex flex-col">
                {items.map((item: SearchItem) => (
                  <div
                    key={item.id}
                    className="px-4 py-2 cursor-pointer hover:bg-[var(--color-action-hover)] transition-colors"
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg text-[var(--color-text-secondary)]">
                        {item.icon}
                      </span>
                      <div className="flex-1">
                        <Space>
                          <span>{item.title}</span>
                          {item.keywords?.slice(0, 2).map((kw) => (
                            <Tag key={kw} className="text-xs opacity-60">
                              {kw}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* No results */}
        {searchValue.trim() && filteredItems.length === 0 && (
          <div className="py-12 text-center text-[var(--color-text-tertiary)]">
            <SearchOutlined className="text-4xl mb-2" />
            <p>{t("未找到相关结果")}</p>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="px-4 py-2 border-t border-(--color-border) flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
        <Space>
          <kbd className="px-1.5 py-0.5 rounded bg-(--color-bg-tertiary)">
            ↑
          </kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-(--color-bg-tertiary)">
            ↓
          </kbd>
          <span>{t("导航")}</span>
        </Space>
        <Space>
          <kbd className="px-1.5 py-0.5 rounded bg-(--color-bg-tertiary)">
            Enter
          </kbd>
          <span>{t("选择")}</span>
        </Space>
        <Space>
          <kbd className="px-1.5 py-0.5 rounded bg-(--color-bg-tertiary)">
            Esc
          </kbd>
          <span>{t("关闭")}</span>
        </Space>
      </div>
    </Modal>
  );
};

export default SearchCommand;
