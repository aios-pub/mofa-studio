/**
 * 提示词列表页面
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Input,
  Button,
  Tag,
  Dropdown,
  message,
  Modal,
  Drawer,
  Form,
  Select,
  Switch,
  Space,
  Tabs,
  Card,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  FileTextOutlined,
  CodeOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { Prompt, PromptVariable } from '@/services';
import { promptApi } from '@/services';
import PromptVersionHistory from '../../components/prompt/PromptVersionHistory';
import PromptTestPanel from '../../components/prompt/PromptTestPanel';

// 变量类型选项
const variableTypeOptions = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'enum', label: '枚举' },
  { value: 'date', label: '日期' },
];

// 预设模板
const presetTemplates = [
  {
    key: 'translation',
    name: '翻译助手',
    category: '翻译',
    content: `你是一个专业的翻译助手。请将用户输入的内容从 {{source_language}} 翻译成 {{target_language}}。

翻译要求：
1. 保持原文的语气和风格
2. 使用地道的表达方式
3. 专业术语保持准确
4. 必要时提供注释说明`,
    variables: [
      { name: 'source_language', type: 'enum' as const, defaultValue: '英语', required: true, options: ['中文', '英语', '日语', '韩语', '法语', '德语'] },
      { name: 'target_language', type: 'enum' as const, defaultValue: '中文', required: true, options: ['中文', '英语', '日语', '韩语', '法语', '德语'] },
    ],
  },
  {
    key: 'code-review',
    name: '代码审查',
    category: '开发',
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
      { name: 'project_name', type: 'string' as const, defaultValue: '我的项目', required: true },
      { name: 'language', type: 'enum' as const, defaultValue: 'JavaScript', required: true, options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust'] },
      { name: 'review_focus', type: 'string' as const, defaultValue: '全部', required: false },
    ],
  },
  {
    key: 'assistant',
    name: '通用助手',
    category: '通用',
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
      { name: 'agent_name', type: 'string' as const, defaultValue: '小助手', required: true },
    ],
  },
  {
    key: 'data-analysis',
    name: '数据分析',
    category: '分析',
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

export default function PromptListPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 编辑器 Drawer 状态
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await promptApi.getAll();
      setPrompts(data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新 selectedPrompt 使其与列表数据同步
  useEffect(() => {
    if (selectedPrompt) {
      const updated = prompts.find((p) => p.id === selectedPrompt.id);
      if (updated) {
        setSelectedPrompt(updated);
      }
    }
  }, [prompts, selectedPrompt]);

  // 打开新建
  const handleCreate = () => {
    setEditingPrompt(null);
    form.resetFields();
    setActiveTab('content');
    setEditorOpen(true);
  };

  // 打开编辑
  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    form.setFieldsValue({
      name: prompt.name,
      description: prompt.description,
      category: prompt.category,
      content: prompt.content,
      variables: prompt.variables.map((v) => ({
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue || '',
        required: v.required,
        options: v.options?.join(', ') || '',
      })),
    });
    setActiveTab('content');
    setEditorOpen(true);
  };

  // 应用模板
  const applyTemplate = (template: (typeof presetTemplates)[number]) => {
    form.setFieldsValue({
      name: template.name,
      category: template.category,
      content: template.content,
      variables: template.variables.map((v) => ({
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue || '',
        required: v.required,
        options: v.options?.join(', ') || '',
      })),
    });
    setActiveTab('content');
    message.info(`已应用「${template.name}」模板`);
  };

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const variables: PromptVariable[] = (values.variables || []).map(
        (v: { name: string; type: string; defaultValue: string; required: boolean; options: string }) => ({
          name: v.name,
          type: v.type as PromptVariable['type'],
          defaultValue: v.defaultValue || undefined,
          required: v.required ?? false,
          ...(v.type === 'enum' && v.options ? { options: v.options.split(',').map((s: string) => s.trim()) } : {}),
        }),
      );

      const promptData = {
        name: values.name,
        description: values.description || '',
        category: values.category || '通用',
        content: values.content,
        variables,
      };

      if (editingPrompt) {
        const saved = await promptApi.update(editingPrompt.id, promptData);
        message.success('提示词已更新');
        setSelectedPrompt(saved || null);
      } else {
        const saved = await promptApi.create(promptData);
        message.success('提示词已创建');
        setSelectedPrompt(saved);
      }

      setEditorOpen(false);
      loadPrompts();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // antd form validation error, ignore
        return;
      }
      console.error('Failed to save prompt:', error);
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const handleEditorCancel = () => {
    setEditorOpen(false);
    setEditingPrompt(null);
  };

  // 删除（带确认）
  const handleDelete = (prompt: Prompt) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除提示词「${prompt.name}」吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await promptApi.delete(prompt.id);
          setPrompts((prev) => prev.filter((p) => p.id !== prompt.id));
          if (selectedPrompt?.id === prompt.id) {
            setSelectedPrompt(null);
          }
          message.success('提示词已删除');
        } catch (error) {
          console.error('Failed to delete prompt:', error);
          message.error('删除失败');
        }
      },
    });
  };

  const handleDuplicate = async (prompt: Prompt) => {
    try {
      const newPrompt = await promptApi.create({
        name: `${prompt.name} (副本)`,
        description: prompt.description,
        content: prompt.content,
        category: prompt.category,
        variables: prompt.variables,
      });
      setPrompts((prev) => [...prev, newPrompt]);
      message.success('提示词已复制');
    } catch (error) {
      console.error('Failed to duplicate prompt:', error);
      message.error('复制失败');
    }
  };

  // 获取所有分类
  const categories = ['all', ...new Set(prompts.map((p) => p.category))];

  // 过滤提示词
  const filteredPrompts = prompts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 获取操作菜单
  const getActionMenuItems = (prompt: Prompt) => [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => handleEdit(prompt),
    },
    {
      key: 'copy',
      label: '复制',
      icon: <CopyOutlined />,
      onClick: () => handleDuplicate(prompt),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(prompt),
    },
  ];

  // 预览内容（替换变量）
  const getPreviewContent = () => {
    const content = form.getFieldValue('content') || '';
    const variables: { name: string; defaultValue?: string }[] = form.getFieldValue('variables') || [];
    let preview = content;
    variables.forEach((v) => {
      preview = preview.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), v.defaultValue || `[${v.name}]`);
    });
    return preview;
  };

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">提示词管理</h2>
            <Button type="primary" icon={<PlusOutlined />} size="small" onClick={handleCreate}>
              新建
            </Button>
          </div>

          {/* 搜索 */}
          <Input
            placeholder="搜索提示词..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />

          {/* 分类筛选 */}
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => (
              <Tag
                key={cat}
                color={selectedCategory === cat ? 'blue' : 'default'}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? '全部' : cat}
              </Tag>
            ))}
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">加载中...</div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <FileTextOutlined className="text-3xl mb-2 opacity-50" />
              <p>暂无提示词</p>
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                onClick={() => setSelectedPrompt(prompt)}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedPrompt?.id === prompt.id
                    ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                    : 'hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileTextOutlined className="flex-shrink-0 text-[var(--color-text-tertiary)] mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--color-text-primary)] truncate">
                        {prompt.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">v{prompt.version}</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-tertiary)] truncate">{prompt.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 bg-[var(--color-bg-base)] rounded text-[var(--color-text-tertiary)]">
                        {prompt.category}
                      </span>
                      {prompt.variables.length > 0 && (
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {prompt.variables.length} 个变量
                        </span>
                      )}
                    </div>
                  </div>
                  <Dropdown
                    menu={{ items: getActionMenuItems(prompt) }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedPrompt ? (
          <PromptDetail
            prompt={selectedPrompt}
            onUpdate={loadPrompts}
            onEdit={() => handleEdit(selectedPrompt)}
            onDelete={() => handleDelete(selectedPrompt)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileTextOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个提示词</h3>
              <p className="text-[var(--color-text-secondary)]">从左侧列表中选择查看详情</p>
            </div>
          </div>
        )}
      </div>

      {/* 新建/编辑 Drawer */}
      <Drawer
        title={editingPrompt ? '编辑提示词' : '新建提示词'}
        placement="right"
        size={{ width: 720 }}
        open={editorOpen}
        onClose={handleEditorCancel}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleEditorCancel}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              保存
            </Button>
          </div>
        }
      >
        {/* 预设模板（仅新建时显示） */}
        {!editingPrompt && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, color: 'var(--color-text-tertiary)', fontSize: 12, fontWeight: 500 }}>
              快速开始 - 选择模板
            </div>
            <Space wrap>
              {presetTemplates.map((t) => (
                <Button key={t.key} size="small" onClick={() => applyTemplate(t)}>
                  {t.name}
                </Button>
              ))}
            </Space>
          </div>
        )}

        <Form form={form} layout="vertical" initialValues={{ category: '通用', variables: [] }}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="提示词名称" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item label="分类" name="category" style={{ flex: 1 }}>
              <Input placeholder="分类名称" />
            </Form.Item>
            <Form.Item label="描述" name="description" style={{ flex: 2 }}>
              <Input placeholder="简短描述用途" />
            </Form.Item>
          </Space>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'content',
                label: '内容',
                icon: <FileTextOutlined />,
                children: (
                  <Form.Item
                    name="content"
                    rules={[{ required: true, message: '请输入提示词内容' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input.TextArea
                      placeholder="输入提示词内容，使用 {{变量名}} 插入变量..."
                      autoSize={{ minRows: 14, maxRows: 30 }}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                ),
              },
              {
                key: 'variables',
                label: '变量',
                icon: <CodeOutlined />,
                children: (
                  <Form.List name="variables">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.length === 0 ? (
                          <Empty description="暂无变量" style={{ margin: '24px 0' }} />
                        ) : (
                          fields.map(({ key, name, ...restField }) => (
                            <Card
                              key={key}
                              size="small"
                              style={{ marginBottom: 12 }}
                              extra={
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<MinusCircleOutlined />}
                                  onClick={() => remove(name)}
                                />
                              }
                            >
                              <Space style={{ width: '100%' }} size="small" wrap>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'name']}
                                  label="变量名"
                                  rules={[{ required: true, message: '必填' }]}
                                  style={{ marginBottom: 0, width: 150 }}
                                >
                                  <Input placeholder="variable_name" />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'type']}
                                  label="类型"
                                  style={{ marginBottom: 0, width: 110 }}
                                >
                                  <Select options={variableTypeOptions} />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'defaultValue']}
                                  label="默认值"
                                  style={{ marginBottom: 0, width: 120 }}
                                >
                                  <Input placeholder="默认值" />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'required']}
                                  label="必填"
                                  valuePropName="checked"
                                  style={{ marginBottom: 0 }}
                                >
                                  <Switch size="small" />
                                </Form.Item>
                              </Space>
                              <Form.Item noStyle shouldUpdate={(prev, cur) => {
                                const prevType = prev.variables?.[name]?.type;
                                const curType = cur.variables?.[name]?.type;
                                return prevType !== curType;
                              }}>
                                {({ getFieldValue }) =>
                                  getFieldValue(['variables', name, 'type']) === 'enum' ? (
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'options']}
                                      label="枚举选项（逗号分隔）"
                                      style={{ marginBottom: 0, marginTop: 8 }}
                                    >
                                      <Input placeholder="选项1, 选项2, 选项3" />
                                    </Form.Item>
                                  ) : null
                                }
                              </Form.Item>
                            </Card>
                          ))
                        )}
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                          添加变量
                        </Button>
                      </>
                    )}
                  </Form.List>
                ),
              },
              {
                key: 'preview',
                label: '预览',
                icon: <PlayCircleOutlined />,
                children: (
                  <Form.Item shouldUpdate style={{ marginBottom: 0 }}>
                    {() => (
                      <Card size="small" title="预览结果">
                        <pre
                          style={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            fontSize: 13,
                            margin: 0,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {getPreviewContent() || '请在「内容」标签页中填写提示词内容'}
                        </pre>
                      </Card>
                    )}
                  </Form.Item>
                ),
              },
            ]}
          />
        </Form>
      </Drawer>
    </div>
  );
}

// 提示词详情组件
function PromptDetail({
  prompt,
  onUpdate,
  onEdit,
  onDelete,
}: {
  prompt: Prompt;
  onUpdate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'content' | 'variables' | 'versions' | 'test'>('content');
  const [currentPrompt, setCurrentPrompt] = useState(prompt);

  useEffect(() => {
    setCurrentPrompt(prompt);
  }, [prompt]);

  const handleRollback = async () => {
    onUpdate();
    const updated = await promptApi.getById(prompt.id);
    if (updated) {
      setCurrentPrompt(updated);
    }
  };

  const tabs = [
    { key: 'content', label: '内容', icon: FileTextOutlined },
    { key: 'variables', label: '变量', icon: CodeOutlined },
    { key: 'versions', label: '版本历史', icon: HistoryOutlined },
    { key: 'test', label: '测试', icon: PlayCircleOutlined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{currentPrompt.name}</h2>
          <p className="text-[var(--color-text-secondary)]">{currentPrompt.description}</p>
        </div>
        <Space>
          <Button icon={<DeleteOutlined />} danger onClick={onDelete}>
            删除
          </Button>
          <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
            编辑
          </Button>
        </Space>
      </div>

      {/* 元信息 */}
      <div className="grid grid-cols-3 gap-4 px-6 pb-4">
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">分类</span>
          <p className="text-sm text-[var(--color-text-primary)]">{currentPrompt.category}</p>
        </div>
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">版本</span>
          <p className="text-sm text-[var(--color-text-primary)]">v{currentPrompt.version}</p>
        </div>
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">变量数</span>
          <p className="text-sm text-[var(--color-text-primary)]">{currentPrompt.variables.length}</p>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex gap-1 px-6 border-b border-[var(--color-border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Icon />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'content' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
              <pre className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono">
                {currentPrompt.content}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
              {currentPrompt.variables.length === 0 ? (
                <p className="text-center text-[var(--color-text-tertiary)] py-4">暂无变量</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-2 text-[var(--color-text-tertiary)]">变量名</th>
                      <th className="text-left py-2 text-[var(--color-text-tertiary)]">类型</th>
                      <th className="text-left py-2 text-[var(--color-text-tertiary)]">默认值</th>
                      <th className="text-left py-2 text-[var(--color-text-tertiary)]">必填</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPrompt.variables.map((variable) => (
                      <tr key={variable.name} className="border-b border-[var(--color-border)]/50">
                        <td className="py-2">
                          <code className="text-[var(--color-primary)]">{`{{${variable.name}}}`}</code>
                        </td>
                        <td className="py-2 text-[var(--color-text-secondary)]">{variable.type}</td>
                        <td className="py-2 text-[var(--color-text-secondary)]">{variable.defaultValue || '-'}</td>
                        <td className="py-2">
                          {variable.required ? (
                            <span className="text-red-500">是</span>
                          ) : (
                            <span className="text-[var(--color-text-tertiary)]">否</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="h-full">
            <PromptVersionHistory prompt={currentPrompt} onRollback={handleRollback} />
          </div>
        )}

        {activeTab === 'test' && (
          <div className="h-full">
            <PromptTestPanel
              prompt={currentPrompt}
              content={currentPrompt.content}
              variables={currentPrompt.variables}
            />
          </div>
        )}
      </div>
    </div>
  );
}
