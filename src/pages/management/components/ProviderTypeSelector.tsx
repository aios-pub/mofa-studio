/**
 * Provider 类型选择器组件
 * 支持分类展示、搜索过滤和卡片选择
 */

import React, { useState, useMemo } from "react";
import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type {
  ProviderType,
  ProviderCategory,
  ProviderConfig,
} from "../../../types/provider";
import {
  getProvidersByCategory,
  categoryInfo,
} from "../../../services/provider/providerConfigs";

interface ProviderTypeSelectorProps {
  selectedType?: ProviderType;
  onSelect: (config: ProviderConfig) => void;
}

const categories: ProviderCategory[] = [
  "cloud",
  "opensource",
  "custom",
];

export const ProviderTypeSelector: React.FC<ProviderTypeSelectorProps> = ({
  selectedType,
  onSelect,
}) => {
  const [activeCategory, setActiveCategory] =
    useState<ProviderCategory>("cloud");
  const [searchQuery, setSearchQuery] = useState("");

  // 获取当前分类的厂商列表
  const providers = useMemo(() => {
    return getProvidersByCategory(activeCategory);
  }, [activeCategory]);

  // 搜索过滤
  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) {
      return providers;
    }
    const query = searchQuery.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query),
    );
  }, [providers, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* 分类标签 */}
      <div className="flex gap-1 p-4 pb-2">
        {categories.map((category) => {
          const info = categoryInfo[category];
          const count = getProvidersByCategory(category).length;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeCategory === category
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
              }`}
            >
              {info.name}
              <span className="ml-1 text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 搜索框 */}
      <div className="px-4 pb-2">
        <Input
          placeholder="搜索厂商或模型..."
          prefix={
            <SearchOutlined className="text-[var(--color-text-tertiary)]" />
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>

      {/* 厂商列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredProviders.map((config) => (
            <ProviderCard
              key={config.type}
              config={config}
              selected={selectedType === config.type}
              onClick={() => onSelect(config)}
            />
          ))}
        </div>

        {filteredProviders.length === 0 && (
          <div className="text-center py-8 text-[var(--color-text-tertiary)]">
            <p>未找到匹配的厂商</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 厂商卡片组件
interface ProviderCardProps {
  config: ProviderConfig;
  selected: boolean;
  onClick: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  config,
  selected,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        selected
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
          : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-primary)]/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
            selected
              ? "bg-[var(--color-primary)]/20"
              : "bg-[var(--color-bg-tertiary)]"
          }`}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-text-primary)] truncate">
              {config.name}
            </span>
            {selected && (
              <span className="text-[var(--color-primary)] text-xs">✓</span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-2 mt-0.5">
            {config.description}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {config.api.authType === 'none' ? '无需密钥' : 'API Key 认证'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderTypeSelector;
