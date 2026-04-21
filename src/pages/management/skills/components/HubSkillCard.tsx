/**
 * Hub Skill 卡片组件 (V2)
 * 支持新版 HubSkill 接口
 */

import { Card, Tag, Button, Rate, Typography, Tooltip, Badge } from 'antd';
import {
  DownloadOutlined,
  CloudDownloadOutlined,
  LoadingOutlined,
  StarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { HubSkill, HubSkillLegacy } from '@/types/skill';

const { Text, Paragraph } = Typography;

interface HubSkillCardProps {
  skill: HubSkill | HubSkillLegacy;
  isInstalled?: boolean;
  isInstalling?: boolean;
  onInstall?: () => void;
  onClick?: () => void;
}

function isNewHubSkill(skill: HubSkill | HubSkillLegacy): skill is HubSkill {
  return 'namespaceSlug' in skill;
}

function formatDownloads(num: number) {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  return num.toString();
}

export function HubSkillCard({
  skill,
  isInstalled,
  isInstalling,
  onInstall,
  onClick,
}: HubSkillCardProps) {
  const isNew = isNewHubSkill(skill);

  // Extract common properties with fallback
  const name = isNew ? (skill.displayName || skill.slug) : skill.name;
  const description = isNew ? (skill.summary || skill.description) : skill.description;
  const downloads = skill.downloadCount || skill.downloads || 0;
  const rating = isNew ? skill.ratingAvg : skill.rating;
  const updatedAt = skill.updatedAt;
  const tags = skill.tags || [];
  const labels = isNew ? skill.labels : [];

  // Version (for old interface)
  const version = !isNew ? skill.version : undefined;

  return (
    <Card
      hoverable
      size="small"
      className="h-full"
      styles={{
        body: { padding: '12px 16px' },
      }}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 mr-2">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Text strong ellipsis className="text-sm">
                {name}
              </Text>
              {isNew && (
                <>
                  <Tag color="blue">{skill.visibility}</Tag>
                  {skill.status === 'ACTIVE' && (
                    <Tag color="green">活跃</Tag>
                  )}
                  {skill.hidden && (
                    <Tag color="red">已隐藏</Tag>
                  )}
                </>
              )}
              {!isNew && (
                <Tag color={
                  skill.type === 'builtin' ? 'blue' :
                  skill.type === 'custom' ? 'purple' : 'orange'
                }>
                  {skill.type === 'builtin' ? '内置' :
                   skill.type === 'custom' ? '自定义' : 'API'}
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isNew ? `${skill.namespaceSlug}/` : ''}
              {isNew ? skill.ownerDisplayName || skill.ownerId : skill.author}
            </Text>
          </div>
          {version && (
            <Tag color="cyan">{version}</Tag>
          )}
        </div>

        {/* 描述 */}
        <Paragraph
          ellipsis={{ rows: 2 }}
          type="secondary"
          style={{ fontSize: 12, marginBottom: 8, flex: 1 }}
        >
          {description}
        </Paragraph>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {labels.slice(0, 2).map(label => (
            <Tag key={label.id} color={label.type === 'RECOMMENDED' ? 'blue' : 'purple'} style={{ fontSize: 11, margin: 0 }}>
              {label.displayName}
            </Tag>
          ))}
          {tags.slice(0, labels.length > 0 ? 1 : 3).map((tag) => (
            <Tag key={tag} style={{ fontSize: 11, margin: 0 }}>
              {tag}
            </Tag>
          ))}
        </div>

        {/* 统计 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Tooltip title="下载量">
              <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                <DownloadOutlined />
                <span>{formatDownloads(downloads)}</span>
              </div>
            </Tooltip>
            {isNew && (
              <Tooltip title="Star">
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                  <StarOutlined />
                  <span>{skill.starCount}</span>
                </div>
              </Tooltip>
            )}
            <Tooltip title="评分">
              <div className="flex items-center gap-1">
                <Rate disabled value={rating} count={1} style={{ fontSize: 12 }} />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {rating ? rating.toFixed(1) : '-'}
                  {isNew && skill.ratingCount > 0 && ` (${skill.ratingCount})`}
                </span>
              </div>
            </Tooltip>
          </div>
          <Tooltip title={`更新于 ${new Date(updatedAt).toLocaleDateString('zh-CN')}`}>
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
              <ClockCircleOutlined />
              <span>{new Date(updatedAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </Tooltip>
        </div>

        {/* 安装按钮 */}
        <Button
          type={isInstalled ? 'default' : 'primary'}
          size="small"
          block
          icon={isInstalling ? <LoadingOutlined /> : isInstalled ? <StarOutlined /> : <CloudDownloadOutlined />}
          disabled={isInstalled || isInstalling}
          onClick={(e) => {
            e.stopPropagation();
            onInstall?.();
          }}
        >
          {isInstalling ? '安装中...' : isInstalled ? '已安装' : '安装'}
        </Button>
      </div>
    </Card>
  );
}
