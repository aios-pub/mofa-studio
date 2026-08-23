/**
 * Promotion Queue Component
 * Manage cross-namespace skill promotion requests
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
  Select,
  message,
  Card,
  Badge,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { skillHubV2Api } from '@/services';
import { useSkillHubStore } from '@/stores/useSkillHubStore';
import type { PromotionTask, PromotionTaskStatus } from '@/types/skill';

const statusConfig: Record<
  PromotionTaskStatus,
  { color: string; text: string }
> = {
  PENDING: { color: 'processing', text: '待审核' },
  APPROVED: { color: 'success', text: '已通过' },
  REJECTED: { color: 'error', text: '已拒绝' },
};

export function PromotionQueue() {
  const {
    promotions,
    promotionsLoading,
    loadPromotions,
    approvePromotion,
    rejectPromotion,
  } = useSkillHubStore();

  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionTask | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadPromotions({});
  }, []);

  const handleSubmitPromotion = async (values: any) => {
    try {
      await skillHubV2Api.submitPromotion({
        sourceSkillId: values.source_skill_id,
        sourceVersionId: values.source_version_id,
        targetNamespaceId: values.target_namespace_id,
      });
      message.success('推广请求已提交');
      setSubmitModalVisible(false);
      form.resetFields();
      loadPromotions({});
    } catch (error) {
      message.error('提交失败');
    }
  };

  const handleApprove = async (id: string, comment?: string) => {
    try {
      await approvePromotion(id, { comment });
      message.success('推广已批准');
      loadPromotions({});
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleReject = async (id: string, comment?: string) => {
    try {
      await rejectPromotion(id, { comment });
      message.success('推广已拒绝');
      loadPromotions({});
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string) => <span className="text-xs">{id.slice(0, 8)}</span>,
    },
    {
      title: '来源',
      key: 'source',
      width: 200,
      render: (_: unknown, record: PromotionTask) => (
        <Space orientation="vertical" size={0}>
          <div className="text-xs text-gray-500">
            {record.source_namespace_slug}
          </div>
          <div>
            <code>{record.source_skill_slug}</code>
          </div>
          <Tag>{record.sourceVersion}</Tag>
        </Space>
      ),
    },
    {
      title: '目标',
      key: 'target',
      width: 150,
      render: (_: unknown, record: PromotionTask) => (
        <Space orientation="vertical" size={0}>
          <div>
            <SwapOutlined className="mr-1" />
            {record.target_namespace_slug}
          </div>
          {record.target_skill_id && (
            <Tag color="blue">已存在</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: PromotionTaskStatus) => {
        const config = statusConfig[status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '提交者',
      key: 'submittedBy',
      width: 100,
      render: (_: unknown, record: PromotionTask) => (
        <span className="text-xs">{record.submitted_by.slice(0, 8)}</span>
      ),
    },
    {
      title: '处理者',
      key: 'reviewedBy',
      width: 100,
      render: (_: unknown, record: PromotionTask) => (
        record.reviewed_by ? (
          <span className="text-xs">{record.reviewed_by.slice(0, 8)}</span>
        ) : '-'
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 160,
      render: (date: Date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: PromotionTask) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedPromotion(record);
              setDetailModalVisible(true);
            }}
          >
            详情
          </Button>
          {record.status === 'PENDING' && (
            <>
              <Popconfirm
                title="确认批准此推广？"
                onConfirm={() => handleApprove(record.id)}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<CheckOutlined />}
                >
                  批准
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确认拒绝此推广？"
                onConfirm={() => handleReject(record.id)}
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                >
                  拒绝
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <Space>
            <SwapOutlined />
            <span>推广队列</span>
            <Badge count={(promotions?.items || []).filter(p => p.status === 'PENDING').length} />
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setSubmitModalVisible(true)}
          >
            提交推广
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={promotions?.items || []}
          loading={promotionsLoading}
          rowKey="id"
          pagination={{
            current: promotions?.page || 1,
            pageSize: promotions?.pageSize || 20,
            total: promotions?.total || 0,
            onChange: (page) => loadPromotions({ page: page - 1 }),
          }}
        />
      </Card>

      {/* Submit Promotion Modal */}
      <Modal
        title={
          <Space>
            <SendOutlined />
            <span>提交推广请求</span>
          </Space>
        }
        open={submitModalVisible}
        onCancel={() => setSubmitModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitPromotion}
        >
          <Form.Item
            name="sourceSkillId"
            label="源技能 ID"
            rules={[{ required: true, message: '请输入源技能 ID' }]}
          >
            <Input placeholder="技能 ID" />
          </Form.Item>
          <Form.Item
            name="sourceVersionId"
            label="源版本 ID"
            rules={[{ required: true, message: '请输入源版本 ID' }]}
          >
            <Input placeholder="版本 ID" />
          </Form.Item>
          <Form.Item
            name="targetNamespaceId"
            label="目标命名空间 ID"
            rules={[{ required: true, message: '请输入目标命名空间 ID' }]}
          >
            <Input placeholder="命名空间 ID" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Promotion Detail Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>推广详情</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedPromotion(null);
        }}
        footer={[
          selectedPromotion?.status === 'PENDING' ? (
            <>
              <Popconfirm
                key="approve"
                title="确认批准此推广？"
                onConfirm={() => handleApprove(selectedPromotion.id)}
              >
                <Button type="primary" icon={<CheckOutlined />}>
                  批准
                </Button>
              </Popconfirm>
              <Popconfirm
                key="reject"
                title="确认拒绝此推广？"
                onConfirm={() => handleReject(selectedPromotion.id)}
              >
                <Button danger icon={<CloseOutlined />}>
                  拒绝
                </Button>
              </Popconfirm>
            </>
          ) : null,
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false);
              setSelectedPromotion(null);
            }}
          >
            关闭
          </Button>,
        ]}
        width={600}
      >
        {selectedPromotion && (
          <div>
            <div className="space-y-2 mb-4">
              <div>
                <span className="text-gray-600">推广 ID: </span>
                <span>{selectedPromotion.id.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-gray-600">来源: </span>
                <Tag color="blue">{selectedPromotion.source_namespace_slug}</Tag>
                <code>{selectedPromotion.source_skill_slug}</code>
                <Tag>{selectedPromotion.sourceVersion}</Tag>
              </div>
              <div>
                <span className="text-gray-600">目标: </span>
                <Tag color="green">{selectedPromotion.target_namespace_slug}</Tag>
                {selectedPromotion.target_skill_id && (
                  <Tag color="orange">已存在技能</Tag>
                )}
              </div>
              <div>
                <span className="text-gray-600">状态: </span>
                {(() => {
                  const config = statusConfig[selectedPromotion.status];
                  return <Tag color={config.color}>{config.text}</Tag>;
                })()}
              </div>
              <div>
                <span className="text-gray-600">提交者: </span>
                <span>{selectedPromotion.submitted_by.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-gray-600">提交时间: </span>
                <span>{new Date(selectedPromotion.submitted_at).toLocaleString('zh-CN')}</span>
              </div>
              {selectedPromotion.reviewed_by && (
                <>
                  <div>
                    <span className="text-gray-600">处理者: </span>
                    <span>{selectedPromotion.reviewed_by.slice(0, 8)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">处理时间: </span>
                    <span>
                      {selectedPromotion.reviewed_at
                        ? new Date(selectedPromotion.reviewed_at).toLocaleString('zh-CN')
                        : '-'}
                    </span>
                  </div>
                  {selectedPromotion.review_comment && (
                    <div>
                      <span className="text-gray-600">处理说明: </span>
                      <span>{selectedPromotion.review_comment}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
