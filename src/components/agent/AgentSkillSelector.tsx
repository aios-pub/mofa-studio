/**
 * Agent associated skills selector
 */

import { useState, useEffect } from "react";
import { Input } from "antd";
import {
  SearchOutlined,
  CloseOutlined,
  UpOutlined,
  DownOutlined,
  ThunderboltOutlined,
  PlayCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { skillApi } from "@/services";
import type { Skill } from "@/services";

interface AgentSkillSelectorProps {
  agentId: string;
  selectedSkills: string[];
  onChange: (skills: string[]) => void;
}

export default function AgentSkillSelector({
  selectedSkills,
  onChange,
}: AgentSkillSelectorProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [testingSkill, setTestingSkill] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await skillApi.getAll();
      setSkills(data);
    } catch (error) {
      console.error("Failed to load skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      onChange(selectedSkills.filter((id) => id !== skillId));
    } else {
      onChange([...selectedSkills, skillId]);
    }
  };

  const testSkill = async (skillId: string) => {
    setTestingSkill(skillId);
    try {
      await skillApi.execute(skillId, { test: true });
    } catch (error) {
      console.error("Skill test failed:", error);
    } finally {
      setTestingSkill(null);
    }
  };

  const filteredSkills = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group by category
  const groupedSkills = filteredSkills.reduce(
    (acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    },
    {} as Record<string, Skill[]>,
  );

  // Type color mapping
  const typeColors: Record<string, string> = {
    builtin:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    custom: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    api: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  // Selected skills
  const selectedSkillObjects = skills.filter((s) =>
    selectedSkills.includes(s.id),
  );

  return (
    <div className="space-y-4">
      {/* Selected skills */}
      {selectedSkillObjects.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
            已关联 Skills ({selectedSkillObjects.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedSkillObjects.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-1 px-2 py-1 bg-[var(--color-primary)]/10 border border-(--color-primary)/30 rounded-lg"
              >
                <ThunderboltOutlined className="text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-primary)]">
                  {skill.name}
                </span>
                <button
                  onClick={() => toggleSkill(skill.id)}
                  className="p-0.5 hover:bg-[var(--color-primary)]/20 rounded"
                >
                  <CloseOutlined className="text-xs text-[var(--color-primary)]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search box */}
      <Input
        placeholder="搜索 Skills..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
      />

      {/* Skills list */}
      {loading ? (
        <div className="text-center py-4 text-[var(--color-text-tertiary)]">
          加载中...
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(groupedSkills).map(([category, categorySkills]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
                {category}
              </h4>
              <div className="space-y-2">
                {categorySkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.id);
                  const isExpanded = expandedSkill === skill.id;
                  const isTesting = testingSkill === skill.id;

                  return (
                    <div
                      key={skill.id}
                      className={`border rounded-lg overflow-hidden transition-colors ${
                        isSelected
                          ? "bg-[var(--color-primary)]/5 border-(--color-primary)/30"
                          : "bg-[var(--color-bg-secondary)] border-(--color-border) hover:border-[var(--color-border-hover)]"
                      } ${!skill.enabled ? "opacity-60" : ""}`}
                    >
                      {/* Header */}
                      <div
                        className={`flex items-center gap-3 p-3 ${skill.enabled ? "cursor-pointer" : ""}`}
                        onClick={() => skill.enabled && toggleSkill(skill.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSkill(skill.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={!skill.enabled}
                          className="rounded border-(--color-border)"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <ThunderboltOutlined className="text-[var(--color-text-tertiary)]" />
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                              {skill.name}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${typeColors[skill.type]}`}
                            >
                              {skill.type === "builtin"
                                ? "内置"
                                : skill.type === "custom"
                                  ? "自定义"
                                  : "API"}
                            </span>
                            {!skill.enabled && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                禁用
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                            {skill.description}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSkill(isExpanded ? null : skill.id);
                          }}
                          className="p-1 hover:bg-(--color-bg-tertiary) rounded"
                        >
                          {isExpanded ? (
                            <UpOutlined className="text-[var(--color-text-tertiary)]" />
                          ) : (
                            <DownOutlined className="text-[var(--color-text-tertiary)]" />
                          )}
                        </button>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-(--color-border)">
                          <div className="mt-2 space-y-3">
                            {/* Parameter list */}
                            {Array.isArray(skill.parameters) &&
                              skill.parameters.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-medium text-[var(--color-text-tertiary)] mb-1">
                                    参数
                                  </h5>
                                  <div className="space-y-1">
                                    {(Array.isArray(skill.parameters)
                                      ? skill.parameters
                                      : []
                                    ).map((param) => (
                                      <div
                                        key={param.name}
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        <code className="px-1.5 py-0.5 bg-(--color-bg-tertiary) rounded text-[var(--color-primary)]">
                                          {param.name}
                                        </code>
                                        <span className="text-[var(--color-text-tertiary)]">
                                          ({param.type})
                                        </span>
                                        {param.required && (
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        )}
                                        <span className="text-[var(--color-text-tertiary)]">
                                          - {param.description}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {/* Timeout */}
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[var(--color-text-tertiary)]">
                                超时时间:
                              </span>
                              <span className="text-[var(--color-text-secondary)]">
                                {skill.timeout / 1000}s
                              </span>
                            </div>

                            {/* Test button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                testSkill(skill.id);
                              }}
                              disabled={isTesting || !skill.enabled}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-(--color-bg-tertiary) hover:bg-[var(--color-bg-base)] border border-(--color-border) rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isTesting ? (
                                <LoadingOutlined className="animate-spin" />
                              ) : (
                                <PlayCircleOutlined />
                              )}
                              {isTesting ? "测试中..." : "测试"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
