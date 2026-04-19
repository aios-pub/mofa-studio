/**
 * 管理面板组件 - 举报处理、技能隐藏、命名空间管理等管理操作
 */

import { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  Select,
  message,
  Card,
  Tabs,
  Popconfirm,
  Badge,
} from 'antd';

const { TextArea } = Input;
import {
  EyeOutlined,
  WarningOutlined,
  StopOutlined,
  TeamOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useSkillHubStore } from '@/stores/useSkillHubStore';
import { NamespaceManager } from './NamespaceManager';
import { PromotionQueue } from './PromotionQueue';
import type { SkillReport, ReportStatus } from '@/types/skill';

const statusConfig: Record<
  ReportStatus,
  { color: string; text: string }
> = {
  PENDING: { color: 'processing', text: '待处理' },
  DISMISSED: { color: 'default', text: '已忽略' },
  RESOLVED: { color: 'success', text: '已处理' },
};

const reportActions = [
  { value: 'dismiss', label: '忽略', color: 'default' },
  { value: 'hide', label: '隐藏技能', color: 'warning' },
  { value: 'yank', label: '撤回版本', color: 'error' },
];

export function AdminGovernancePanel() {
  const {
    reports,
    reportsLoading,
    loadReports,
    resolveReport,
  } = useSkillHubStore();

  const [activeTab, setActiveTab] = useState<'reports' | 'hidden' | 'namespaces' | 'promotions'>('reports');
  const [selectedReport, setSelectedReport] = useState<SkillReport | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadReports({ status: 'PENDING' });
  }, []);

  const handleResolveReport = async () => {
    if (!selectedReport) return;

    try {
      await resolveReport(selectedReport.id, { action, comment });
      message.success('处理成功');
      setModalVisible(false);
      loadReports({ status: 'PENDING' });
    } catch (err) {
      message.error('操作失败: ' + (err as Error).message);
    }
  };

  const reportColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string) => <span className="text-xs">{id.slice(0, 8)}</span>,
    },
    {
      title: '技能 ID',
      dataIndex: 'skillId',
      key: 'skillId',
      width: 80,
      render: (id: string) => <span className="text-xs">{id.slice(0, 8)}</span>,
    },
    {
      title: '举报原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
    },
    {
      title: '详细说明',
      dataIndex: 'details',
      key: 'details',
      width: 200,
      ellipsis: true,
    },
    {
      title: '举报者',
      dataIndex: 'reporterId',
      key: 'reporterId',
      width: 100,
      render: (id: string) => <span className="text-xs">{id.slice(0, 8)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ReportStatus) => {
        const config = statusConfig[status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: Date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '处理者',
      dataIndex: 'handledBy',
      key: 'handledBy',
      width: 100,
      render: (handler: string | undefined) => handler || '-',
    },
    {
      title: '处理说明',
      dataIndex: 'handleComment',
      key: 'handleComment',
      width: 150,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: SkillReport) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedReview(record);
              setModalVisible(true);
              setAction('dismiss');
            }}
          >
            查看
          </Button>
          {record.status === 'PENDING' && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => {
                setSelectedReview(record);
                setModalVisible(true);
                setAction('hide');
              }}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const setSelectedReview = (report: SkillReport) => {
    setSelectedReport(report);
  };

  return (
    <div className="p-6">
      <Card
        title={
          <Space>
            <WarningOutlined />
            <span>管理面板</span>
            <Badge count={reports?.items.filter(r => r.status === 'PENDING').length || 0} />
          </Space>
        }
        bordered={false}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'reports' | 'hidden' | 'namespaces' | 'promotions')}
          items={[
            {
              key: 'reports',
              label: `举报处理 (${reports?.items.filter(r => r.status === 'PENDING').length || 0})`,
            },
            {
              key: 'hidden',
              label: '已隐藏技能',
            },
            {
              key: 'namespaces',
              label: (
                <span>
                  <TeamOutlined />
                  {' '}
                  命名空间管理
                </span>
              ),
            },
            {
              key: 'promotions',
              label: (
                <span>
                  <SwapOutlined />
                  {' '}
                  推广队列
                </span>
              ),
            },
          ]}
        />

        {activeTab === 'reports' && (
          <Table
            columns={reportColumns}
            dataSource={reports?.items || []}
            loading={reportsLoading}
            rowKey="id"
            pagination={{
              current: reports?.page || 1,
              pageSize: reports?.pageSize || 20,
              total: reports?.total || 0,
              onChange: (page) => loadReports({ page: page - 1 }),
            }}
          />
        )}

        {activeTab === 'hidden' && (
          <div className="text-center py-12 text-gray-400">
            <StopOutlined style={{ fontSize: 48 }} />
            <div className="mt-4">已隐藏技能列表（待实现）</div>
          </div>
        )}

        {activeTab === 'namespaces' && (
          <div className="bg-white rounded-lg">
            <NamespaceManager />
          </div>
        )}

        {activeTab === 'promotions' && (
          <div className="bg-white rounded-lg">
            <PromotionQueue />
          </div>
        )}
      </Card>

      {/* 处理举报 Modal */}
      <Modal
        title={
          <Space>
            {action === 'hide' ? <StopOutlined /> : <EyeOutlined />}
            <span>{action === 'hide' ? '处理举报' : '查看举报'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={
          action === 'hide'
            ? [
                <Button key="cancel" onClick={() => setModalVisible(false)}>
                  取消
                </Button>,
                <Popconfirm
                  key="confirm"
                  title="确定要处理此举报吗？"
                  onConfirm={handleResolveReport}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="primary" danger>
                    确认处理
                  </Button>
                </Popconfirm>,
              ]
            : [
                <Button key="close" type="primary" onClick={() => setModalVisible(false)}>
                  关闭
                </Button>,
              ]
        }
        width={600}
      >
        {selectedReport && (
          <div>
            <div className="space-y-2 mb-4">
              <div>
                <span className="text-gray-600">举报 ID: </span>
                <span>{selectedReport.id.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-gray-600">技能 ID: </span>
                <span>{selectedReport.skillId.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-gray-600">举报原因: </span>
                <Tag color="warning">{selectedReport.reason}</Tag>
              </div>
              <div>
                <span className="text-gray-600">详细说明: </span>
                <span>{selectedReport.details}</span>
              </div>
              <div>
                <span className="text-gray-600">举报者: </span>
                <span>{selectedReport.reporterId.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-gray-600">举报时间: </span>
                <span>{new Date(selectedReport.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>

            {action === 'hide' && (
              <div className="border-t pt-4">
                <div className="mb-3">
                  <span className="text-gray-600">处理操作: </span>
                  <Select
                    value={action}
                    onChange={setAction}
                    options={reportActions.map(a => ({ label: a.label, value: a.value }))}
                    style={{ width: 150 }}
                  />
                </div>
                <div>
                  <span className="text-gray-600 block mb-2">处理说明: </span>
                  <TextArea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="请输入处理说明..."
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
