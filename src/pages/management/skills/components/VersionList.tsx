/**
 * 版本列表组件
 */

import { Timeline, Tag, Button, Space, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  StopOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { HubSkillVersion, SkillVersionStatus } from '@/types/skill';

interface VersionListProps {
  versions: HubSkillVersion[];
  onVersionSelect: (version: string) => void;
}

const statusConfig: Record<
  SkillVersionStatus,
  { color: string; icon: React.ReactNode; text: string }
> = {
  PUBLISHED: { color: 'success', icon: <CheckCircleOutlined />, text: '已发布' },
  DRAFT: { color: 'default', icon: <ClockCircleOutlined />, text: '草稿' },
  SCANNING: { color: 'processing', icon: <SyncOutlined spin />, text: '扫描中' },
  SCAN_FAILED: { color: 'error', icon: <CloseCircleOutlined />, text: '扫描失败' },
  UPLOADED: { color: 'default', icon: <CheckCircleOutlined />, text: '已上传' },
  PENDING_REVIEW: { color: 'warning', icon: <ClockCircleOutlined />, text: '待审核' },
  REJECTED: { color: 'error', icon: <CloseCircleOutlined />, text: '已拒绝' },
  YANKED: { color: 'error', icon: <StopOutlined />, text: '已撤回' },
};

export function VersionList({ versions, onVersionSelect }: VersionListProps) {
  return (
    <Timeline mode="left" className="mt-4">
      {versions.map((version, index) => {
        const config = statusConfig[version.status];
        return (
          <Timeline.Item
            key={version.id}
            color={config.color}
            dot={config.icon}
            label={
              <div className="text-xs text-gray-500">
                {version.createdAt.toLocaleDateString()}
              </div>
            }
          >
            <div className="flex items-start justify-between py-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">v{version.version}</span>
                  <Tag color={config.color}>{config.text}</Tag>
                </div>
                {version.changelog && (
                  <p className="text-sm text-gray-600 mb-1">{version.changelog}</p>
                )}
                <div className="text-xs text-gray-500">
                  {version.fileCount} 个文件 · {(version.totalSize / 1024).toFixed(1)} KB
                </div>
                {version.yankReason && (
                  <p className="text-sm text-red-500 mt-1">撤回原因: {version.yankReason}</p>
                )}
              </div>
              <Space>
                {version.status === 'PUBLISHED' && version.downloadReady && (
                  <Tooltip title="查看文件">
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={() => onVersionSelect(version.version)}
                    />
                  </Tooltip>
                )}
              </Space>
            </div>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
