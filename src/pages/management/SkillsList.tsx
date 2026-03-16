/**
 * Skills 管理页面
 * Tab 布局：本地 Skills | Skill Hub | 发布 Skill
 */

import { useState } from 'react';
import { Tabs, Typography } from 'antd';
import {
  ThunderboltOutlined,
  CloudOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { LocalSkillsList, HubSkillsView, PublishSkillView } from './skills';
import { SkillDetail } from './SkillDetail';
import type { Skill } from '../../services/mock/skills';
import { skillApi } from '../../services/mock/skills';

const { Text, Title } = Typography;

export default function SkillsListPage() {
  const [activeTab, setActiveTab] = useState<'local' | 'hub' | 'publish'>('local');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const handleToggleEnabled = async (skill: Skill) => {
    try {
      const updated = await skillApi.update(skill.id, { enabled: !skill.enabled });
      if (updated) {
        setSelectedSkill(updated);
      }
    } catch (error) {
      console.error('Failed to toggle skill:', error);
    }
  };

  const tabs = [
    {
      key: 'local',
      label: (
        <span className="flex items-center gap-2">
          <ThunderboltOutlined />
          本地 Skills
        </span>
      ),
    },
    {
      key: 'hub',
      label: (
        <span className="flex items-center gap-2">
          <CloudOutlined />
          Skill Hub
        </span>
      ),
    },
    {
      key: 'publish',
      label: (
        <span className="flex items-center gap-2">
          <CloudUploadOutlined />
          发布 Skill
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标签栏 */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as typeof activeTab)}
          items={tabs}
          className="px-4 pt-2"
          tabBarStyle={{ marginBottom: 0 }}
        />
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'local' && (
          <div className="flex h-full">
            {/* 左侧列表 */}
            <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
              <LocalSkillsList
                selectedSkill={selectedSkill}
                onSelectSkill={setSelectedSkill}
              />
            </div>

            {/* 右侧详情 */}
            <div className="flex-1 overflow-y-auto">
              {selectedSkill ? (
                <SkillDetail
                  skill={selectedSkill}
                  onToggleEnabled={handleToggleEnabled}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <ThunderboltOutlined style={{ fontSize: 48, color: 'var(--color-text-tertiary)', marginBottom: 16 }} />
                    <Title level={5} type="secondary">选择一个 Skill</Title>
                    <Text type="secondary">从左侧列表中选择查看详情</Text>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hub' && <HubSkillsView />}

        {activeTab === 'publish' && <PublishSkillView />}
      </div>
    </div>
  );
}
