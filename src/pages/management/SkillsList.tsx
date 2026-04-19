/**
 * Skills 管理页面
 * Tab 布局：本地 Skills | Skill Hub | 发布 Skill | 审核管理 | 管理面板
 */

import { useState } from 'react';
import { Tabs, Typography } from 'antd';
import {
  ThunderboltOutlined,
  CloudOutlined,
  CloudUploadOutlined,
  AuditOutlined,
  SettingOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { LocalSkillsList, HubSkillsViewV2, PublishSkillViewV2 } from './skills';
import { SkillDetail } from './SkillDetail';
import { ReviewQueue } from './skills/components/ReviewQueue';
import { AdminGovernancePanel } from './skills/components/AdminGovernancePanel';
import { MySkillsPage } from './skills/components/MySkillsPage';
import { MyStarsPage } from './skills/components/MyStarsPage';
import { GovernanceInbox } from './skills/components/GovernanceInbox';
import { ApiTokenManagement } from './skills/components/ApiTokenManagement';
import type { Skill } from '@/services';
import { skillApi } from '@/services';

const { Text, Title } = Typography;

export default function SkillsListPage() {
  const [activeTab, setActiveTab] = useState<'local' | 'hub' | 'publish' | 'my-skills' | 'my-stars' | 'governance' | 'review' | 'admin' | 'tokens'>('local');
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
    {
      key: 'my-skills',
      label: (
        <span className="flex items-center gap-2">
          📋 我的技能
        </span>
      ),
    },
    {
      key: 'my-stars',
      label: (
        <span className="flex items-center gap-2">
          ⭐ 我的收藏
        </span>
      ),
    },
    {
      key: 'governance',
      label: (
        <span className="flex items-center gap-2">
          📬 治理收件箱
        </span>
      ),
    },
    {
      key: 'review',
      label: (
        <span className="flex items-center gap-2">
          <AuditOutlined />
          审核队列
        </span>
      ),
    },
    {
      key: 'admin',
      label: (
        <span className="flex items-center gap-2">
          <SettingOutlined />
          管理面板
        </span>
      ),
    },
    {
      key: 'tokens',
      label: (
        <span className="flex items-center gap-2">
          <KeyOutlined />
          API 令牌
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

        {activeTab === 'hub' && <HubSkillsViewV2 />}

        {activeTab === 'publish' && <PublishSkillViewV2 />}

        {activeTab === 'my-skills' && <MySkillsPage />}

        {activeTab === 'my-stars' && <MyStarsPage />}

        {activeTab === 'governance' && <GovernanceInbox />}

        {activeTab === 'review' && <ReviewQueue />}

        {activeTab === 'admin' && <AdminGovernancePanel />}

        {activeTab === 'tokens' && <ApiTokenManagement />}
      </div>
    </div>
  );
}
