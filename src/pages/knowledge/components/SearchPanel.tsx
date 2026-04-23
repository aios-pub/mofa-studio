/**
 * 知识搜索面板组件
 */

import { useState } from "react";
import { Input, Button, Tag, Empty, Spin, Slider } from "antd";
import { SearchOutlined, FileTextOutlined } from "@ant-design/icons";
import { knowledgeApi } from "@/services";
import type {
  SearchResponse,
  SearchResultItem,
} from "../../../types/knowledge";

interface SearchPanelProps {
  knowledgeBaseId: string;
}

export default function SearchPanel({ knowledgeBaseId }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searchTime, setSearchTime] = useState<number>(0);
  const [topK, setTopK] = useState(5);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const response: SearchResponse = await knowledgeApi.search({
        knowledgeBaseId,
        query: query.trim(),
        topK,
        includeContent: true,
        includeMetadata: true,
      });
      setResults(response.results);
      setSearchTime(response.took);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return "green";
    if (score >= 0.7) return "blue";
    if (score >= 0.5) return "orange";
    return "red";
  };

  const highlightContent = (content: string, query: string) => {
    if (!query.trim()) return content;
    const regex = new RegExp(`(${query.trim()})`, "gi");
    return content.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  return (
    <div className="space-y-4">
      {/* 搜索输入 */}
      <div className="flex gap-2">
        <Input
          placeholder="输入问题进行知识检索..."
          prefix={<SearchOutlined />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          size="large"
          allowClear
        />
        <Button
          type="primary"
          size="large"
          onClick={handleSearch}
          loading={loading}
        >
          搜索
        </Button>
      </div>

      {/* 搜索配置 */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--color-text-tertiary)]">
          返回结果数:
        </span>
        <Slider
          min={1}
          max={20}
          value={topK}
          onChange={setTopK}
          className="w-32"
        />
        <span className="text-sm font-medium">{topK}</span>
      </div>

      {/* 搜索结果 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {/* 搜索统计 */}
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
            <span>找到 {results.length} 条结果</span>
            <span>耗时 {searchTime}ms</span>
          </div>

          {/* 结果列表 */}
          {results.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-(--color-bg-tertiary) rounded-lg border border-(--color-border)"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileTextOutlined className="text-[var(--color-text-tertiary)]" />
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {item.documentName}
                  </span>
                </div>
                <Tag color={getScoreColor(item.score)}>
                  相似度: {(item.score * 100).toFixed(1)}%
                </Tag>
              </div>
              <div
                className="text-sm text-[var(--color-text-secondary)] line-clamp-4"
                dangerouslySetInnerHTML={{
                  __html: highlightContent(item.content, query),
                }}
              />
              {item.metadata && (
                <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                  来源: {item.metadata.source}
                  {item.metadata.author && ` · 作者: ${item.metadata.author}`}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : query ? (
        <Empty description="输入关键词进行搜索" className="py-8" />
      ) : (
        <Empty description="暂无搜索结果" className="py-8" />
      )}
    </div>
  );
}
