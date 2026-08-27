import { useTranslation } from "react-i18next";
/**
 * Prompt editor component
 * Three-pane layout: preset templates, main editing area, and preview
 */

import { useState, useEffect, useCallback } from "react";
import {
  SaveOutlined,
  FunctionOutlined,
  FileTextOutlined,
  CalendarOutlined,
  NumberOutlined,
  FontSizeOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Checkbox,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { Prompt, PromptVariable } from "@/services";
import { promptApi } from "@/services";

const { Text } = Typography;

interface PromptEditorProps {
  promptId?: string;
  onSave?: (prompt: Prompt) => void;
  onCancel?: () => void;
}

// System variable definitions
const systemVariables = [
  { name: "current_date", label: "当前日期", example: "2024-01-15" },
  { name: "current_time", label: "当前时间", example: "14:30:00" },
  {
    name: "current_datetime",
    label: "当前日期时间",
    example: "2024-01-15 14:30:00",
  },
  { name: "user_name", label: "用户名", example: "张三" },
  { name: "user_id", label: "用户ID", example: "user-123" },
  { name: "agent_name", label: "Agent名称", example: "助手A" },
  { name: "agent_id", label: "Agent ID", example: "agent-001" },
];

// Preset templates
const presetTemplates = [
  {
    id: "translation",
    name: "翻译助手",
    category: "翻译",
    content: `你是一个专业的翻译助手。请将用户输入的内容从 {{source_language}} 翻译成 {{target_language}}。

翻译要求：
1. 保持原文的语气和风格
2. 使用地道的表达方式
3. 专业术语保持准确
4. 必要时提供注释说明`,
    variables: [
      {
        name: "source_language",
        type: "enum" as const,
        defaultValue: "英语",
        required: true,
        options: ["中文", "英语", "日语", "韩语", "法语", "德语"],
      },
      {
        name: "target_language",
        type: "enum" as const,
        defaultValue: "中文",
        required: true,
        options: ["中文", "英语", "日语", "韩语", "法语", "德语"],
      },
    ],
  },
  {
    id: "code-review",
    name: "代码审查",
    category: "开发",
    content: `你是一个专业的代码审查助手。请根据以下规范审查代码：

项目: {{project_name}}
语言: {{language}}
审查重点: {{review_focus}}

请从以下维度进行评估：
1. 代码质量 - 可读性、可维护性
2. 性能优化 - 算法效率、资源使用
3. 安全性 - 潜在漏洞、敏感数据处理
4. 最佳实践 - 代码规范、设计模式

请提供具体的改进建议。`,
    variables: [
      {
        name: "project_name",
        type: "string" as const,
        defaultValue: "我的项目",
        required: true,
      },
      {
        name: "language",
        type: "enum" as const,
        defaultValue: "JavaScript",
        required: true,
        options: ["JavaScript", "TypeScript", "Python", "Java", "Go", "Rust"],
      },
      {
        name: "review_focus",
        type: "string" as const,
        defaultValue: "全部",
        required: false,
      },
    ],
  },
  {
    id: "assistant",
    name: "通用助手",
    category: "通用",
    content: `你是一个友好、专业的 AI 助手，名字叫 {{agent_name}}。

你的职责是：
1. 准确理解用户的问题
2. 提供清晰、有帮助的回答
3. 必要时请求更多信息
4. 保持专业和友好的语气

回答原则：
- 简洁明了，避免冗余
- 提供示例帮助理解
- 不确定时诚实说明
- 保护用户隐私`,
    variables: [
      {
        name: "agent_name",
        type: "string" as const,
        defaultValue: "小助手",
        required: true,
      },
    ],
  },
  {
    id: "data-analysis",
    name: "数据分析",
    category: "分析",
    content: `你是一个数据分析专家，擅长处理和解读各类数据。

可用的分析工具：
- SQL 查询
- Python 数据处理 (pandas, numpy)
- 统计分析
- 数据可视化

请根据用户的需求：
1. 理解数据结构和业务背景
2. 提供分析思路和方法
3. 编写分析代码
4. 解释结果并给出建议`,
    variables: [],
  },
];

// Variable type options (labels resolved through i18n at usage site)
const variableTypes = [
  { value: "string", label: "字符串", icon: FontSizeOutlined },
  { value: "number", label: "数字", icon: NumberOutlined },
  { value: "enum", label: "枚举", icon: UnorderedListOutlined },
  { value: "date", label: "日期", icon: CalendarOutlined },
];

export default function PromptEditor({
  promptId,
  onSave,
  onCancel,
}: PromptEditorProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "content" | "variables" | "preview"
  >("content");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("通用");
  const [content, setContent] = useState("");
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [originalPrompt, setOriginalPrompt] = useState<Prompt | null>(null);

  // Preview state
  const [previewValues, setPreviewValues] = useState<Record<string, string>>(
    {},
  );

  // Whether modified
  const hasChanges = originalPrompt
    ? name !== originalPrompt.name ||
      description !== originalPrompt.description ||
      content !== originalPrompt.content ||
      JSON.stringify(variables) !== JSON.stringify(originalPrompt.variables)
    : name || description || content;

  // Load prompts
  useEffect(() => {
    if (promptId) {
      loadPrompt(promptId);
    }
  }, [promptId]);

  const loadPrompt = async (id: string) => {
    try {
      setLoading(true);
      const prompt = await promptApi.getById(id);
      if (prompt) {
        setName(prompt.name);
        setDescription(prompt.description);
        setCategory(prompt.category);
        setContent(prompt.content);
        setVariables(prompt.variables);
        setOriginalPrompt(prompt);
      }
    } catch (error) {
      console.error("Failed to load prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply preset template
  const applyTemplate = (template: (typeof presetTemplates)[0]) => {
    setName(template.name);
    setCategory(template.category);
    setContent(template.content);
    setVariables(
      template.variables.map((v) => ({ ...v, required: v.required ?? false })),
    );
    setActiveTab("content");
  };

  // Add variable
  const addVariable = () => {
    setVariables((prev) => {
      const newVar: PromptVariable = {
        name: `variable_${prev.length + 1}`,
        type: "string",
        defaultValue: "",
        required: false,
      };
      return [...prev, newVar];
    });
  };

  // Update variable
  const updateVariable = (index: number, updates: Partial<PromptVariable>) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], ...updates };
    setVariables(newVars);
  };

  // Delete variable
  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  // Insert variable into content at the textarea cursor
  const insertVariable = (varName: string) => {
    const textarea = document.querySelector(
      'textarea[name="content"]',
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        content.substring(0, start) + `{{${varName}}}` + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + varName.length + 4,
          start + varName.length + 4,
        );
      }, 0);
    } else {
      setContent(content + `{{${varName}}}`);
    }
  };

  // Preview content (variables substituted)
  const getPreviewContent = useCallback(() => {
    let preview = content;
    // Replace custom variables
    variables.forEach((v) => {
      const value = previewValues[v.name] || v.defaultValue || `[${v.name}]`;
      preview = preview.replace(
        new RegExp(`\\{\\{${v.name}\\}\\}`, "g"),
        value,
      );
    });
    // Replace system variables
    const now = new Date();
    systemVariables.forEach((sv) => {
      let value = "";
      switch (sv.name) {
        case "current_date":
          value = now.toLocaleDateString();
          break;
        case "current_time":
          value = now.toLocaleTimeString();
          break;
        case "current_datetime":
          value = now.toLocaleString();
          break;
        case "user_name":
          value = t("当前用户");
          break;
        case "user_id":
          value = "user-current";
          break;
        case "agent_name":
          value = t("AI助手");
          break;
        case "agent_id":
          value = "agent-current";
          break;
      }
      preview = preview.replace(
        new RegExp(`\\{\\{${sv.name}\\}\\}`, "g"),
        value,
      );
    });
    return preview;
  }, [content, variables, previewValues, t]);

  // Save
  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      message.warning(t("请填写名称和内容"));
      return;
    }

    try {
      setSaving(true);
      const promptData = {
        name: name.trim(),
        description: description.trim(),
        category,
        content: content.trim(),
        variables,
      };

      let savedPrompt: Prompt;
      if (originalPrompt) {
        savedPrompt = (await promptApi.update(originalPrompt.id, promptData))!;
      } else {
        savedPrompt = await promptApi.create(promptData);
      }

      setOriginalPrompt(savedPrompt);
      onSave?.(savedPrompt);
    } catch (error) {
      console.error("Failed to save prompt:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: "content",
      label: (
        <span className="flex items-center gap-1.5">
          <FileTextOutlined />
          {t("内容")}
        </span>
      ),
    },
    {
      key: "variables",
      label: (
        <span className="flex items-center gap-1.5">
          <FunctionOutlined />
          {t("变量")}
        </span>
      ),
    },
    {
      key: "preview",
      label: (
        <span className="flex items-center gap-1.5">
          <EyeOutlined />
          {t("预览")}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-(--color-border)">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {originalPrompt ? t("编辑提示词") : t("新建提示词")}
          </h2>
          {hasChanges && <Tag color="warning">{t("有未保存的更改")}</Tag>}
        </div>
        <Space>
          <Button onClick={onCancel}>{t("取消")}</Button>
          <Button icon={<EyeOutlined />} onClick={() => setActiveTab("preview")}>
            {t("预览")}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!name.trim() || !content.trim()}
          >
            {t("保存")}
          </Button>
        </Space>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Left: preset templates */}
          <div className="w-56 border-r border-(--color-border) p-3 overflow-y-auto bg-[var(--color-bg-secondary)]">
            <h3 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
              {t("预设模板")}
            </h3>
            <div className="space-y-1">
              {presetTemplates.map((template) => (
                <Button
                  key={template.id}
                  type="text"
                  block
                  onClick={() => applyTemplate(template)}
                  className="!justify-start !h-auto !py-2"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <BulbOutlined className="text-[var(--color-primary)]" />
                      <span className="text-sm text-[var(--color-text-primary)]">
                        {template.name}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {template.category}
                    </span>
                  </div>
                </Button>
              ))}
            </div>

            <h3 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2 mt-4">
              {t("系统变量")}
            </h3>
            <div className="space-y-1">
              {systemVariables.map((sv) => (
                <Button
                  key={sv.name}
                  type="text"
                  block
                  onClick={() => insertVariable(sv.name)}
                  className="!justify-start !h-auto !py-2"
                >
                  <div className="text-left">
                    <code className="text-xs text-[var(--color-primary)]">{`{{${sv.name}}}`}</code>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {t(sv.label)}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Center: editing area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Basic info form */}
            <div className="p-4 border-b border-(--color-border)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    {t("名称")} *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("提示词名称")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    {t("分类")}
                  </label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={t("分类名称")}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  {t("描述")}
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("简短描述提示词的用途")}
                />
              </div>
            </div>

            {/* Tabs bar + content */}
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as typeof activeTab)}
              items={tabItems}
            />
            <div
              className={`flex-1 p-4 ${
                activeTab === "content" ? "overflow-hidden" : "overflow-y-auto"
              }`}
            >
              {activeTab === "content" && (
                <Input.TextArea
                  name="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("输入提示词内容，使用 {{变量名}} 插入变量...")}
                  className="font-mono"
                  style={{ height: "100%", resize: "none" }}
                />
              )}

              {activeTab === "variables" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Text strong>{t("自定义变量")}</Text>
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={addVariable}
                    >
                      {t("添加变量")}
                    </Button>
                  </div>

                  {variables.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t("暂无自定义变量")}
                      className="py-8"
                    >
                      <Text type="secondary" className="text-xs block">
                        {t("点击上方按钮添加变量")}
                      </Text>
                    </Empty>
                  ) : (
                    <div className="space-y-3">
                      {variables.map((v, index) => (
                        <div
                          key={index}
                          className="p-3 bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm text-[var(--color-primary)]">{`{{${v.name}}}`}</code>
                            <Button
                              type="link"
                              size="small"
                              onClick={() => insertVariable(v.name)}
                            >
                              {t("插入")}
                            </Button>
                            <div className="flex-1" />
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeVariable(index)}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Input
                              value={v.name}
                              onChange={(e) =>
                                updateVariable(index, { name: e.target.value })
                              }
                              placeholder={t("变量名")}
                              size="small"
                            />
                            <Select
                              value={v.type}
                              onChange={(type) =>
                                updateVariable(index, { type })
                              }
                              options={variableTypes.map((vt) => ({
                                value: vt.value,
                                label: t(vt.label),
                              }))}
                              size="small"
                            />
                            <Input
                              value={v.defaultValue || ""}
                              onChange={(e) =>
                                updateVariable(index, {
                                  defaultValue: e.target.value,
                                })
                              }
                              placeholder={t("默认值")}
                              size="small"
                            />
                            <Checkbox
                              checked={v.required}
                              onChange={(e) =>
                                updateVariable(index, { required: e.target.checked })
                              }
                            >
                              {t("必填")}
                            </Checkbox>
                          </div>
                          {v.type === "enum" && (
                            <div className="mt-2">
                              <Input
                                value={(v.options || []).join(", ")}
                                onChange={(e) =>
                                  updateVariable(index, {
                                    options: e.target.value
                                      .split(",")
                                      .map((s) => s.trim()),
                                  })
                                }
                                placeholder={t("枚举值，用逗号分隔")}
                                size="small"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "preview" && (
                <div className="space-y-4">
                  {/* Variable input */}
                  {variables.length > 0 && (
                    <div className="p-4 bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg">
                      <Text strong className="block mb-3">
                        {t("填写变量值")}
                      </Text>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {variables.map((v) => (
                          <div key={v.name}>
                            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">
                              {v.name}
                              {v.required && (
                                <span className="text-red-500 ml-0.5">*</span>
                              )}
                            </label>
                            {v.type === "enum" ? (
                              <Select
                                className="w-full"
                                value={
                                  previewValues[v.name] ||
                                  v.defaultValue ||
                                  undefined
                                }
                                onChange={(value) =>
                                  setPreviewValues({
                                    ...previewValues,
                                    [v.name]: value,
                                  })
                                }
                                options={(v.options || []).map((opt) => ({
                                  value: opt,
                                  label: opt,
                                }))}
                                size="small"
                              />
                            ) : (
                              <Input
                                type={
                                  v.type === "number"
                                    ? "number"
                                    : v.type === "date"
                                      ? "date"
                                      : "text"
                                }
                                value={
                                  previewValues[v.name] || v.defaultValue || ""
                                }
                                onChange={(e) =>
                                  setPreviewValues({
                                    ...previewValues,
                                    [v.name]: e.target.value,
                                  })
                                }
                                placeholder={v.defaultValue}
                                size="small"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview result */}
                  <div className="p-4 bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg">
                    <Text strong className="block mb-3">
                      {t("预览结果")}
                    </Text>
                    <pre className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono">
                      {getPreviewContent()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
