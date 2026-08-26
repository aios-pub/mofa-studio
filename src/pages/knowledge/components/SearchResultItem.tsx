import { useTranslation } from "react-i18next";
/**
 * Search result item component
 */

import {
  FileTextOutlined,
  CopyOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { Tag, Button, message } from "antd";
import { useState } from "react";
import type { SearchResultItem } from "../../../types/knowledge";

interface SearchResultItemProps {
  item: SearchResultItem;
  query?: string;
  onCopy?: (item: SearchResultItem) => void;
}

export default function SearchResultItemComponent({
  item,
  query,
  onCopy,
}: SearchResultItemProps) {  const { t } = useTranslation();

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(item);
      return;
    }

    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      message.success(t("已复制到剪贴板"));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      message.error(t("复制失败"));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return "green";
    if (score >= 0.7) return "blue";
    if (score >= 0.5) return "orange";
    return "red";
  };

  const highlightContent = (content: string, searchQuery?: string) => {
    if (!searchQuery?.trim()) return content;
    const regex = new RegExp(`(${searchQuery.trim()})`, "gi");
    return content.replace(
      regex,
      '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>',
    );
  };

  return (
    <div className="p-4 bg-(--color-bg-tertiary) rounded-lg border border-(--color-border) hover:border-(--color-primary)/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileTextOutlined className="text-[var(--color-text-tertiary)]" />
          <span className="font-medium text-[var(--color-text-primary)]">
            {item.documentName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tag color={getScoreColor(item.score)}>
            {(item.score * 100).toFixed(1)}%
          </Tag>
          <Button
            type="text"
            size="small"
            icon={
              copied ? (
                <CheckOutlined className="text-green-500" />
              ) : (
                <CopyOutlined />
              )
            }
            onClick={handleCopy}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className="text-sm text-[var(--color-text-secondary)] line-clamp-4 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: highlightContent(item.content, query),
        }}
      />

      {/* Metadata */}
      {item.metadata && (
        <div className="mt-3 pt-3 border-t border-(--color-border) flex flex-wrap gap-2 text-xs text-[var(--color-text-tertiary)]">
          {item.metadata.source && <span>来源: {item.metadata.source}</span>}
          {item.metadata.author && <span>· 作者: {item.metadata.author}</span>}
          {item.metadata.title && <span>· 标题: {item.metadata.title}</span>}
          {item.metadata.created && (
            <span>
              · 创建于: {new Date(item.metadata.created).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
