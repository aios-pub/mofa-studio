/**
 * Hub Skill 卡片组件
 */

import { Card, Tag, Button, Rate, Typography, Tooltip } from 'antd';
import {
  DownloadOutlined,
  CloudDownloadOutlined,
  LoadingOutlined,
  StarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { HubSkill } from '../../../../types/skill';

const { Text, Paragraph } = Typography;

interface HubSkillCardProps {
  skill: HubSkill;
  isInstalled?: boolean;
  isInstalling?: boolean;
  onInstall?: () => void;
  onClick?: () => void;
}

export function HubSkillCard({
  skill,
  isInstalled,
  isInstalling,
  onInstall,
  onClick,
}: HubSkillCardProps) {
  const getTypeTag = (type: HubSkill['type']) => {
    const config: Record<HubSkill['type'], { color: string; label: string }> = {
      builtin: { color: 'blue', label: '内置' },
      custom: { color: 'purple', label: '自定义' },
      api: { color: 'orange', label: 'API' },
    };
    return <Tag color={config[type].color}>{config[type].label}</Tag>;
  };

  const formatDownloads = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toString();
  };

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
            <div className="flex items-center gap-2 mb-1">
              <Text strong ellipsis className="text-sm">
                {skill.name}
              </Text>
              {getTypeTag(skill.type)}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {skill.author}
            </Text>
          </div>
          <Tag color="cyan">{skill.version}</Tag>
        </div>

        {/* 描述 */}
        <Paragraph
          ellipsis={{ rows: 2 }}
          type="secondary"
          style={{ fontSize: 12, marginBottom: 8, flex: 1 }}
        >
          {skill.description}
        </Paragraph>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.tags.slice(0, 3).map((tag) => (
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
                <span>{formatDownloads(skill.downloads)}</span>
              </div>
            </Tooltip>
            <Tooltip title="评分">
              <div className="flex items-center gap-1">
                <Rate disabled value={skill.rating} count={1} style={{ fontSize: 12 }} />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {skill.rating.toFixed(1)}
                </span>
              </div>
            </Tooltip>
          </div>
          <Tooltip title={`更新于 ${new Date(skill.updatedAt).toLocaleDateString('zh-CN')}`}>
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
              <ClockCircleOutlined />
              <span>{new Date(skill.updatedAt).toLocaleDateString('zh-CN')}</span>
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
