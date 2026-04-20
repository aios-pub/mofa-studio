/**
 * 审核队列组件
 */

import { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Card,
  Descriptions,
  Typography,
  Tabs,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useSkillHubStore } from '@/stores/useSkillHubStore';
import type { ReviewTask, ReviewTaskStatus } from '@/types/skill';

const { Text } = Typography;
const { TextArea } = Input;

const statusConfig: Record<
  ReviewTaskStatus,
  { color: string; text: string; icon: React.ReactNode }
> = {
  PENDING: { color: 'processing', text: '待审核', icon: <ClockCircleOutlined /> },
  APPROVED: { color: 'success', text: '已通过', icon: <CheckOutlined /> },
  REJECTED: { color: 'error', text: '已拒绝', icon: <CloseOutlined /> },
  WITHDRAWN: { color: 'default', text: '已撤回', icon: <CloseOutlined /> },
};

export function ReviewQueue() {
  const {
    reviewTasks,
    reviewLoading,
    loadReviews,
    approveReview,
    rejectReview,
    withdrawReviewTask,
  } = useSkillHubStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'my' | 'all'>('pending');
  const [selectedReview, setSelectedReview] = useState<ReviewTask | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [comment, setComment] = useState('');
  const [action, setAction] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    loadReviews({ status: activeTab === 'all' ? undefined : activeTab.toUpperCase() });
  }, [activeTab]);

  const handleAction = async () => {
    if (!selectedReview) return;

    try {
      if (action === 'approve') {
        await approveReview(selectedReview.id, comment);
        message.success('已通过审核');
      } else {
        await rejectReview(selectedReview.id, comment);
        message.success('已拒绝审核');
      }
      setModalVisible(false);
      setComment('');
      loadReviews({ status: activeTab === 'all' ? undefined : activeTab.toUpperCase() });
    } catch (err) {
      message.error('操作失败: ' + (err as Error).message);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string) => <Text copyable>{id.slice(0, 8)}...</Text>,
    },
    {
      title: '技能版本 ID',
      dataIndex: 'skillVersionId',
      key: 'skillVersionId',
      width: 120,
      render: (id: string) => <Text copyable>{id.slice(0, 8)}...</Text>,
    },
    {
      title: '命名空间',
      dataIndex: 'namespaceId',
      key: 'namespaceId',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ReviewTaskStatus) => {
        const config = statusConfig[status];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '提交者',
      dataIndex: 'submittedBy',
      key: 'submittedBy',
      width: 100,
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 160,
      render: (date: Date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '审核者',
      dataIndex: 'reviewedBy',
      key: 'reviewedBy',
      width: 100,
      render: (reviewer: string | undefined) => reviewer || '-',
    },
    {
      title: '审核时间',
      dataIndex: 'reviewedAt',
      key: 'reviewedAt',
      width: 160,
      render: (date: Date | undefined) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: ReviewTask) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedReview(record);
              setModalVisible(true);
              setAction('approve');
              setComment('');
            }}
          >
            查看
          </Button>
          {record.status === 'PENDING' && (
            <>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => {
                  setSelectedReview(record);
                  setModalVisible(true);
                  setAction('reject');
                  setComment('');
                }}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card title="审核队列" variant="borderless">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'pending' | 'my' | 'all')}
          items={[
            { key: 'pending', label: `待处理 (${reviewTasks?.items?.filter(r => r.status === 'PENDING').length || 0})` },
            { key: 'my', label: '我的提交' },
            { key: 'all', label: '全部' },
          ]}
        />

        <Table
          columns={columns}
          dataSource={reviewTasks?.items || []}
          loading={reviewLoading}
          rowKey="id"
          pagination={{
            current: reviewTasks?.page || 1,
            pageSize: reviewTasks?.pageSize || 20,
            total: reviewTasks?.total || 0,
            onChange: (page) => loadReviews({ page: page - 1 }),
          }}
        />
      </Card>

      {/* 审核 Modal */}
      <Modal
        title={action === 'approve' ? '通过审核' : '拒绝审核'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleAction}
        okText={action === 'approve' ? '通过' : '拒绝'}
        okButtonProps={{ danger: action === 'reject' }}
      >
        {selectedReview && (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="审核 ID">{selectedReview.id}</Descriptions.Item>
            <Descriptions.Item label="技能版本 ID">{selectedReview.skillVersionId}</Descriptions.Item>
            <Descriptions.Item label="提交者">{selectedReview.submittedBy}</Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {new Date(selectedReview.submittedAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            {selectedReview.reviewComment && (
              <Descriptions.Item label="审核意见">{selectedReview.reviewComment}</Descriptions.Item>
            )}
          </Descriptions>
        )}
        {action === 'reject' && (
          <div className="mt-4">
            <Text type="secondary">拒绝原因（必填）:</Text>
            <TextArea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请说明拒绝原因..."
              style={{ marginTop: 8 }}
            />
          </div>
        )}
        {action === 'approve' && (
          <div className="mt-4">
            <Text type="secondary">审核意见（可选）:</Text>
            <TextArea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="可以添加审核意见..."
              style={{ marginTop: 8 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
