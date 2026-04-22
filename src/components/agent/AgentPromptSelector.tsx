/**
 * Agent 关联提示词选择器 — 全部使用 antd 组件
 */

import { useState, useEffect } from "react";
import {
  Input,
  Checkbox,
  Tag,
  Collapse,
  Typography,
  Space,
  Spin,
  Empty,
  Button,
} from "antd";
import { SearchOutlined, TagOutlined, RightOutlined } from "@ant-design/icons";
import { promptApi } from "@/services";
import type { Prompt } from "@/services";

const { Text, Paragraph } = Typography;

interface AgentPromptSelectorProps {
  agentId?: string;
  selectedPrompts: string[];
  onChange: (prompts: string[]) => void;
  maxHeight?: number;
}

export default function AgentPromptSelector({
  selectedPrompts,
  onChange,
  maxHeight,
}: AgentPromptSelectorProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await promptApi.getAll();
      setPrompts(data);
    } catch (error) {
      console.error("Failed to load prompts:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePrompt = (promptId: string) => {
    if (selectedPrompts.includes(promptId)) {
      onChange(selectedPrompts.filter((id) => id !== promptId));
    } else {
      onChange([...selectedPrompts, promptId]);
    }
  };

  const filteredPrompts = prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 按分类分组
  const groupedPrompts = filteredPrompts.reduce(
    (acc, prompt) => {
      if (!acc[prompt.category]) {
        acc[prompt.category] = [];
      }
      acc[prompt.category].push(prompt);
      return acc;
    },
    {} as Record<string, Prompt[]>,
  );

  // 已选择的提示词对象
  const selectedPromptObjects = prompts.filter((p) =>
    selectedPrompts.includes(p.id),
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 已选择的提示词标签 */}
      {selectedPromptObjects.length > 0 && (
        <div>
          <Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 4 }}
          >
            已关联 ({selectedPromptObjects.length})
          </Text>
          <Space wrap>
            {selectedPromptObjects.map((prompt) => (
              <Tag
                key={prompt.id}
                closable
                onClose={() => togglePrompt(prompt.id)}
                color="blue"
                icon={<TagOutlined />}
              >
                {prompt.name}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* 搜索框 */}
      <Input
        placeholder="搜索提示词..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
        size="small"
      />

      {/* 提示词列表 */}
      {filteredPrompts.length === 0 ? (
        <Empty
          description="暂无匹配的提示词"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div style={{ maxHeight: maxHeight ?? 360, overflowY: "auto" }}>
          <Collapse
            variant={false}
            size="small"
            defaultActiveKey={Object.keys(groupedPrompts)}
            expandIconPlacement="start"
            style={{ background: "transparent" }}
            items={Object.entries(groupedPrompts).map(function ([
              category,
              categoryPrompts,
            ]) {
              return {
                key: category,
                label: (
                  <Space>
                    <Text strong>{category}</Text>
                    <Tag>{categoryPrompts.length}</Tag>
                  </Space>
                ),
                children: (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {categoryPrompts.map(function (prompt) {
                      const isSelected = selectedPrompts.includes(prompt.id);
                      const isExpanded = expandedPrompt === prompt.id;

                      return (
                        <div
                          key={prompt.id}
                          style={{
                            border: `1px solid ${isSelected ? "var(--color-primary, #1677ff)" : "var(--color-border, #d9d9d9)"}`,
                            borderRadius: 6,
                            background: isSelected
                              ? "var(--color-primary-bg, rgba(22,119,255,0.04))"
                              : "transparent",
                            overflow: "hidden",
                          }}
                        >
                          {/* 头部：Checkbox + 展开按钮 */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 12px",
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => togglePrompt(prompt.id)}
                            >
                              <div>
                                <Space size={4}>
                                  <Text strong>{prompt.name}</Text>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                  >
                                    v{prompt.version}
                                  </Text>
                                </Space>
                                <div>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                    ellipsis
                                  >
                                    {prompt.description}
                                  </Text>
                                </div>
                              </div>
                            </Checkbox>
                            <Button
                              type="text"
                              size="small"
                              icon={
                                <RightOutlined
                                  style={{
                                    transition: "transform 0.2s",
                                    transform: isExpanded
                                      ? "rotate(90deg)"
                                      : "rotate(0deg)",
                                  }}
                                />
                              }
                              onClick={() =>
                                setExpandedPrompt(isExpanded ? null : prompt.id)
                              }
                              style={{ marginLeft: "auto" }}
                            />
                          </div>

                          {/* 展开详情 */}
                          {isExpanded && (
                            <div
                              style={{
                                padding: "0 12px 12px",
                                borderTop:
                                  "1px solid var(--color-border, #d9d9d9)",
                              }}
                            >
                              <div
                                style={{
                                  padding: 8,
                                  borderRadius: 4,
                                  background:
                                    "var(--color-fill-quaternary, #fafafa)",
                                  marginTop: 8,
                                }}
                              >
                                <Paragraph style={{ margin: 0 }}>
                                  <pre
                                    style={{
                                      fontSize: 12,
                                      whiteSpace: "pre-wrap",
                                      fontFamily: "monospace",
                                      color: "var(--color-text-secondary)",
                                      margin: 0,
                                    }}
                                  >
                                    {prompt.content}
                                  </pre>
                                </Paragraph>
                              </div>

                              {prompt.variables.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                  <Text
                                    type="secondary"
                                    style={{
                                      fontSize: 12,
                                      display: "block",
                                      marginBottom: 4,
                                    }}
                                  >
                                    变量
                                  </Text>
                                  <Space wrap size={4}>
                                    {prompt.variables.map((variable) => (
                                      <Tag
                                        key={variable.name}
                                        color={
                                          variable.required ? "red" : "default"
                                        }
                                      >
                                        <code>{`{{${variable.name}}}`}</code> (
                                        {variable.type})
                                      </Tag>
                                    ))}
                                  </Space>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ),
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
