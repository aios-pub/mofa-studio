/**
 * Version list component
 * Supports version lifecycle actions: submit for review, confirm publish, withdraw, unpublish, republish, delete
 */

import { Timeline, Tag, Button, Space, Tooltip, Popconfirm, Modal, Input } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  StopOutlined,
  DownloadOutlined,
  SendOutlined,
  RollbackOutlined,
  RedoOutlined,
  DeleteOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import type { HubSkillVersion, SkillVersionStatus } from '@/types/skill';
import { useSkillHubStore } from '@/stores/useSkillHubStore';

interface VersionListProps {
  namespace: string;
  slug: string;
  versions: HubSkillVersion[];
  onVersionSelect: (version: string) => void;
  onRefresh?: () => void;
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
  YANKED: { color: 'error', icon: <StopOutlined />, text: '已下架' },
};

export function VersionList({ namespace, slug, versions, onVersionSelect, onRefresh }: VersionListProps) {
  const {
    submitReview,
    confirmPublish,
    withdrawReview,
    yankVersion,
    rereleaseVersion,
    deleteVersion,
  } = useSkillHubStore();

  const [yankModalOpen, setYankModalOpen] = useState(false);
  const [yankTargetVersion, setYankTargetVersion] = useState<string>('');
  const [yankReason, setYankReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string>('');

  const handleAction = async (action: string, version: string, fn: () => Promise<unknown>) => {
    const key = `${action}-${version}`;
    setActionLoading(key);
    try {
      await fn();
      onRefresh?.();
    } catch (error) {
      console.error(`${action} failed:`, error);
    } finally {
      setActionLoading('');
    }
  };

  const handleYank = async () => {
    if (!yankReason.trim()) return;
    await handleAction('yank', yankTargetVersion, () =>
      yankVersion(namespace, slug, yankTargetVersion, yankReason)
    );
    setYankModalOpen(false);
    setYankReason('');
  };

  const renderActions = (version: HubSkillVersion) => {
    const actions: React.ReactNode[] = [];
    const isLoading = (action: string) => actionLoading === `${action}-${version.version}`;

    // UPLOADED: submit for review, confirm publish (PRIVATE), delete
    if (version.status === 'UPLOADED') {
      actions.push(
        <Tooltip title="提交审核" key="submit-review">
          <Button
            type="text"
            size="small"
            icon={<SendOutlined />}
            loading={isLoading('submit-review')}
            onClick={() =>
              handleAction('submit-review', version.version, () =>
                submitReview(namespace, slug, version.version)
              )
            }
          >
            提交审核
          </Button>
        </Tooltip>
      );
      actions.push(
        <Tooltip title="确认发布" key="confirm-publish">
          <Button
            type="text"
            size="small"
            icon={<CheckOutlined />}
            loading={isLoading('confirm-publish')}
            onClick={() =>
              handleAction('confirm-publish', version.version, () =>
                confirmPublish(namespace, slug, version.version)
              )
            }
          >
            确认发布
          </Button>
        </Tooltip>
      );
      actions.push(
        <Popconfirm
          key="delete"
          title="删除版本"
          description={`确定要删除版本 ${version.version} 吗？此操作不可撤销。`}
          onConfirm={() =>
            handleAction('delete', version.version, () =>
              deleteVersion(namespace, slug, version.version)
            )
          }
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={isLoading('delete')}
          >
            删除
          </Button>
        </Popconfirm>
      );
    }

    // PENDING_REVIEW: withdraw
    if (version.status === 'PENDING_REVIEW') {
      actions.push(
        <Tooltip title="撤回审核" key="withdraw">
          <Button
            type="text"
            size="small"
            icon={<RollbackOutlined />}
            loading={isLoading('withdraw')}
            onClick={() =>
              handleAction('withdraw', version.version, () =>
                withdrawReview(namespace, slug, version.version)
              )
            }
          >
            撤回审核
          </Button>
        </Tooltip>
      );
    }

    // PUBLISHED: yank
    if (version.status === 'PUBLISHED') {
      actions.push(
        <Tooltip title="查看文件" key="files">
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => onVersionSelect(version.version)}
          >
            查看文件
          </Button>
        </Tooltip>
      );
      actions.push(
        <Button
          key="yank"
          type="text"
          size="small"
          danger
          icon={<StopOutlined />}
          onClick={() => {
            setYankTargetVersion(version.version);
            setYankModalOpen(true);
          }}
        >
          下架
        </Button>
      );
    }

    // YANKED: rerelease
    if (version.status === 'YANKED') {
      actions.push(
        <Tooltip title="重新发布" key="rerelease">
          <Button
            type="text"
            size="small"
            icon={<RedoOutlined />}
            loading={isLoading('rerelease')}
            onClick={() =>
              handleAction('rerelease', version.version, () =>
                rereleaseVersion(namespace, slug, version.version)
              )
            }
          >
            重新发布
          </Button>
        </Tooltip>
      );
    }

    // DRAFT / REJECTED / SCAN_FAILED: delete
    if (['DRAFT', 'REJECTED', 'SCAN_FAILED'].includes(version.status)) {
      actions.push(
        <Popconfirm
          key="delete"
          title="删除版本"
          description={`确定要删除版本 ${version.version} 吗？此操作不可撤销。`}
          onConfirm={() =>
            handleAction('delete', version.version, () =>
              deleteVersion(namespace, slug, version.version)
            )
          }
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={isLoading('delete')}
          >
            删除
          </Button>
        </Popconfirm>
      );
    }

    return actions;
  };

  return (
    <>
      <Timeline mode="left" className="mt-4">
        {versions.map((version) => {
          const config = statusConfig[version.status];
          return (
            <Timeline.Item
              key={version.id}
              color={config.color}
              dot={config.icon}
              label={
                <div className="text-xs text-gray-500">
                  {new Date(version.created_at).toLocaleDateString()}
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
                    {version.file_count} 个文件 · {(version.total_size / 1024).toFixed(1)} KB
                  </div>
                  {version.yankReason && (
                    <p className="text-sm text-red-500 mt-1">下架原因: {version.yankReason}</p>
                  )}
                </div>
                <Space wrap>{renderActions(version)}</Space>
              </div>
            </Timeline.Item>
          );
        })}
      </Timeline>

      {/* Yank Modal */}
      <Modal
        title="下架版本"
        open={yankModalOpen}
        onOk={handleYank}
        onCancel={() => {
          setYankModalOpen(false);
          setYankReason('');
        }}
        okText="确认下架"
        okButtonProps={{ danger: true }}
      >
        <p className="mb-4">
          确定要下架版本 <strong>v{yankTargetVersion}</strong> 吗？
        </p>
        <Input.TextArea
          placeholder="请输入下架原因（必填）"
          value={yankReason}
          onChange={(e) => setYankReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </>
  );
}
