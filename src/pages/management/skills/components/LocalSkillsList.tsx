/**
 * 本地 Skills 列表组件
 */

import { useState, useEffect } from 'react';
import { Input, Button, Tag, Select, message, Collapse, Typography } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  PoweroffOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import type { Skill } from '@/services';
import { skillApi } from '@/services';

const { Text, Title } = Typography;

interface LocalSkillsListProps {
  selectedSkill: Skill | null;
  onSelectSkill: (skill: Skill) => void;
  onRefresh?: () => void;
}

export function LocalSkillsList({ selectedSkill, onSelectSkill, onRefresh }: LocalSkillsListProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await skillApi.getAll();
      setSkills(data);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (skill: Skill) => {
    try {
      const updated = await skillApi.update(skill.id, { enabled: !skill.enabled });
      if (updated) {
        setSkills(skills.map((s) => (s.id === skill.id ? updated : s)));
        if (selectedSkill?.id === skill.id) {
          onSelectSkill(updated);
        }
        message.success(skill.enabled ? '已禁用' : '已启用');
      }
    } catch (error) {
      console.error('Failed to toggle skill:', error);
      message.error('操作失败');
    }
  };

  // 获取所有分类
  const categories = ['all', ...new Set(skills.map((s) => s.category))];

  // 过滤 Skills
  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesType = selectedType === 'all' || s.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  // 按分类分组
  const groupedSkills = filteredSkills.reduce(
    (acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    },
    {} as Record<string, Skill[]>
  );

  const handleCategoryChange = (keys: string | string[]) => {
    setExpandedCategories(Array.isArray(keys) ? keys : [keys]);
  };

  const getTypeTag = (type: Skill['type']) => {
    const config: Record<string, { color: string; label: string }> = {
      builtin: { color: 'blue', label: '内置' },
      custom: { color: 'purple', label: '自定义' },
      api: { color: 'orange', label: 'API' },
    };
    const item = config[type ?? ''] ?? { color: 'default', label: type ?? '未知' };
    return <Tag color={item.color}>{item.label}</Tag>;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 space-y-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <Title level={5} style={{ margin: 0 }}>本地 Skills</Title>
          <Button type="primary" icon={<PlusOutlined />} size="small" />
        </div>

        {/* 搜索 */}
        <Input
          placeholder="搜索 Skills..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />

        {/* 筛选器 */}
        <div className="flex gap-2">
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ flex: 1 }}
            size="small"
            options={categories.map((cat) => ({
              label: cat === 'all' ? '全部分类' : cat,
              value: cat,
            }))}
          />
          <Select
            value={selectedType}
            onChange={setSelectedType}
            style={{ flex: 1 }}
            size="small"
            options={[
              { label: '全部类型', value: 'all' },
              { label: '内置', value: 'builtin' },
              { label: '自定义', value: 'custom' },
              { label: 'API', value: 'api' },
            ]}
          />
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <Text type="secondary">加载中...</Text>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-8">
            <ThunderboltOutlined style={{ fontSize: 24, opacity: 0.5, marginBottom: 8, display: 'block' }} />
            <Text type="secondary">暂无 Skills</Text>
          </div>
        ) : (
          <Collapse
            activeKey={expandedCategories}
            onChange={handleCategoryChange}
            expandIconPosition="start"
            bordered={false}
            style={{ background: 'transparent' }}
            items={Object.entries(groupedSkills).map(([category, categorySkills]) => ({
              key: category,
              label: (
                <div className="flex items-center gap-2">
                  <FolderOutlined style={{ fontSize: 12 }} />
                  <Text strong style={{ fontSize: 13 }}>{category}</Text>
                  <Tag style={{ marginLeft: 4, fontSize: 11 }}>{categorySkills.length}</Tag>
                </div>
              ),
              children: (
                <div className="space-y-1">
                  {categorySkills.map((skill) => (
                    <div
                      key={skill.id}
                      onClick={() => onSelectSkill(skill)}
                      className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedSkill?.id === skill.id
                          ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                          : 'hover:bg-[var(--color-bg-tertiary)] border border-transparent'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 p-1.5 rounded ${
                          skill.enabled
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}
                      >
                        <ThunderboltOutlined style={{ fontSize: 12 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Text strong ellipsis style={{ fontSize: 13 }}>{skill.name}</Text>
                          {getTypeTag(skill.type)}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {Array.isArray(skill.parameters) ? skill.parameters.length : 0} 个参数 · {(skill.timeout ?? 0) / 1000}s 超时
                        </Text>
                      </div>
                      <Button
                        type="text"
                        size="small"
                        icon={<PoweroffOutlined />}
                        className={`flex-shrink-0 ${skill.enabled ? 'text-green-500' : 'text-gray-400'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEnabled(skill);
                        }}
                      />
                    </div>
                  ))}
                </div>
              ),
            }))}
          />
        )}
      </div>
    </div>
  );
}
