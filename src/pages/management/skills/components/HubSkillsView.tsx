/**
 * Skill Hub 浏览视图组件
 */

import { useState, useEffect } from 'react';
import { Input, Select, Typography, Tabs, Row, Col, Empty, Spin, message } from 'antd';
// Text is used in the JSX
import {
  SearchOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { useSkillHubStore } from '../../../../stores/useSkillHubStore';
import { skillApi } from '@/services';
import { HubSkillCard } from './HubSkillCard';
import { HubSkillDetail } from './HubSkillDetail';
import type { HubSkill } from '../../../../types/skill';

const { Title } = Typography;

export function HubSkillsView() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    searchResults,
    searchLoading,
    categories,
    categoriesLoading,
    popularSkills,
    latestSkills,
    featuredLoading,
    installSkill,
    installingSkillIds,
  } = useSkillHubStore();

  const [selectedHubSkill, setSelectedHubSkill] = useState<HubSkill | null>(null);
  const [installedHubIds, setInstalledHubIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'popular' | 'latest' | 'search'>('popular');

  useEffect(() => {
    // 加载分类和热门数据
    useSkillHubStore.getState().loadCategories();
    useSkillHubStore.getState().loadFeatured();
    loadInstalledSkills();
  }, []);

  useEffect(() => {
    // 搜索时自动切换到搜索标签
    if (searchQuery) {
      setActiveTab('search');
      useSkillHubStore.getState().searchSkills();
    }
  }, [searchQuery]);

  const loadInstalledSkills = async () => {
    try {
      const skills = await skillApi.getAll();
      const hubIds = skills
        .filter((s: any) => s.hubId)
        .map((s: any) => s.hubId);
      setInstalledHubIds(hubIds);
    } catch (error) {
      console.error('Failed to load installed skills:', error);
    }
  };

  const handleInstall = async (skill: HubSkill) => {
    const success = await installSkill(skill);
    if (success) {
      setInstalledHubIds(prev => [...prev, skill.hubId]);
      message.success(`${skill.name} 安装成功`);
    } else {
      message.error('安装失败');
    }
    return success;
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value) {
      useSkillHubStore.getState().searchSkills(value);
    }
  };

  const renderSkillGrid = (skills: HubSkill[], loading: boolean) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Spin />
        </div>
      );
    }

    if (skills.length === 0) {
      return (
        <Empty
          description="暂无 Skills"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <Row gutter={[16, 16]}>
        {skills.map((skill) => (
          <Col key={skill.hubId} xs={24} sm={12} md={8} lg={6}>
            <HubSkillCard
              skill={skill}
              isInstalled={installedHubIds.includes(skill.hubId)}
              isInstalling={installingSkillIds.includes(skill.hubId)}
              onInstall={() => handleInstall(skill)}
              onClick={() => setSelectedHubSkill(skill)}
            />
          </Col>
        ))}
      </Row>
    );
  };

  // 详情视图
  if (selectedHubSkill) {
    return (
      <HubSkillDetail
        skill={selectedHubSkill}
        isInstalled={installedHubIds.includes(selectedHubSkill.hubId)}
        isInstalling={installingSkillIds.includes(selectedHubSkill.hubId)}
        onInstall={() => handleInstall(selectedHubSkill)}
        onBack={() => setSelectedHubSkill(null)}
      />
    );
  }

  const tabs = [
    {
      key: 'popular',
      label: (
        <span className="flex items-center gap-2">
          <FireOutlined />
          热门
        </span>
      ),
    },
    {
      key: 'latest',
      label: (
        <span className="flex items-center gap-2">
          <ClockCircleOutlined />
          最新
        </span>
      ),
    },
    {
      key: 'search',
      label: (
        <span className="flex items-center gap-2">
          <SearchOutlined />
          搜索结果
          {searchResults.length > 0 && (
            <span className="text-xs text-[var(--color-text-tertiary)]">
              ({searchResults.length})
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 头部搜索 */}
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-2 mb-3">
          <CloudOutlined style={{ fontSize: 20 }} />
          <Title level={5} style={{ margin: 0 }}>Skill Hub</Title>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="搜索 Skills..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ flex: 1 }}
          />
          <Select
            value={selectedCategory}
            onChange={(value) => {
              setSelectedCategory(value);
              useSkillHubStore.getState().searchSkills();
            }}
            style={{ width: 150 }}
            loading={categoriesLoading}
            options={[
              { label: '全部分类', value: 'all' },
              ...categories.map((cat) => ({
                label: `${cat.name} (${cat.count})`,
                value: cat.name,
              })),
            ]}
          />
        </div>
      </div>

      {/* 标签栏 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={tabs}
        className="px-4 pt-2"
      />

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'popular' && renderSkillGrid(popularSkills, featuredLoading)}
        {activeTab === 'latest' && renderSkillGrid(latestSkills, featuredLoading)}
        {activeTab === 'search' && renderSkillGrid(searchResults, searchLoading)}
      </div>
    </div>
  );
}
