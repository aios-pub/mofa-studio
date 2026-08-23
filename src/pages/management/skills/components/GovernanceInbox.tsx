/**
 * Governance Inbox Component
 * Unified governance inbox: review queue, promotion requests, reports
 */

import { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Tag,
  Badge,
  Button,
  Space,
  Typography,
  Empty,
  Spin,
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useSkillHubStore } from '@/stores/useSkillHubStore';
import type { ReviewTask, PromotionTask, SkillReport } from '@/types/skill';

const { Text } = Typography;

interface GovernanceItem {
  id: string;
  type: 'review' | 'promotion' | 'report';
  title: string;
  subtitle?: string;
  namespace?: string;
  skillSlug?: string;
  status: string;
  timestamp: string;
  data: ReviewTask | PromotionTask | SkillReport;
}

export function GovernanceInbox() {
  const {
    reviewTasks,
    reviewLoading,
    loadReviews,
    promotions,
    promotionsLoading,
    loadPromotions,
    reports,
    reportsLoading,
    loadReports,
  } = useSkillHubStore();

  const [activeTab, setActiveTab] = useState<'all' | 'review' | 'promotion' | 'report'>('all');
  const [items, setItems] = useState<GovernanceItem[]>([]);

  useEffect(() => {
    loadReviews({});
    loadPromotions({});
    loadReports({});
  }, []);

  useEffect(() => {
    // Combine all items into a single list
    const allItems: GovernanceItem[] = [];

    (reviewTasks?.items || []).forEach((review: ReviewTask) => {
      allItems.push({
        id: review.id,
        type: 'review',
        title: '审核请求',
        subtitle: `Version ${review.version} · ${review.namespace_id || ''}`,
        status: review.status,
        timestamp: review.submitted_at.toISOString(),
        data: review,
      });
    });

    (promotions?.items || []).forEach((promotion: PromotionTask) => {
      allItems.push({
        id: promotion.id,
        type: 'promotion',
        title: '推广请求',
        subtitle: `${promotion.source_namespace_slug} → ${promotion.target_namespace_slug}`,
        status: promotion.status,
        timestamp: promotion.submitted_at.toISOString(),
        data: promotion,
      });
    });

    (reports?.items || []).forEach((report: SkillReport) => {
      allItems.push({
        id: report.id,
        type: 'report',
        title: '举报',
        subtitle: report.reason,
        status: report.status,
        timestamp: report.created_at.toISOString(),
        data: report,
      });
    });

    // Sort by timestamp (newest first)
    allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setItems(allItems);
  }, [reviewTasks, promotions, reports]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'review':
        return <CheckCircleOutlined className="text-blue-500" />;
      case 'promotion':
        return <SwapOutlined className="text-purple-500" />;
      case 'report':
        return <ExclamationCircleOutlined className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (type: string, status: string) => {
    const configs: Record<string, Record<string, { color: string; text: string }>> = {
      review: {
        PENDING: { color: 'processing', text: '待审核' },
        APPROVED: { color: 'success', text: '已通过' },
        REJECTED: { color: 'error', text: '已拒绝' },
        WITHDRAWN: { color: 'default', text: '已撤回' },
      },
      promotion: {
        PENDING: { color: 'processing', text: '待审核' },
        APPROVED: { color: 'success', text: '已通过' },
        REJECTED: { color: 'error', text: '已拒绝' },
      },
      report: {
        PENDING: { color: 'processing', text: '待处理' },
        RESOLVED: { color: 'success', text: '已解决' },
        DISMISSED: { color: 'default', text: '已忽略' },
      },
    };

    const typeConfig = configs[type as keyof typeof configs];
    const statusConfig = typeConfig?.[status];
    if (!statusConfig) {
      return <Tag>{status}</Tag>;
    }
    return <Tag color={statusConfig.color}>{statusConfig.text}</Tag>;
  };

  const pendingCount = {
    reviews: (reviewTasks?.items || []).filter(r => r.status === 'PENDING').length,
    promotions: (promotions?.items || []).filter(p => p.status === 'PENDING').length,
    reports: (reports?.items || []).filter(r => r.status === 'PENDING').length,
  };

  const totalPending = pendingCount.reviews + pendingCount.promotions + pendingCount.reports;

  const filteredItems = items.filter(item => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  const handleItemClick = (item: GovernanceItem) => {
    // TODO: Navigate to detail page
    console.log('Navigate to:', item.type, item.id);
  };

  return (
    <div className="p-6">
      <Card
        title={
          <Space>
            <span className="font-medium">治理收件箱</span>
            {totalPending > 0 && (
              <Badge count={totalPending} overflowCount={99} />
            )}
          </Space>
        }
        extra={
          <Button onClick={() => {
            loadReviews({});
            loadPromotions({});
            loadReports({});
          }}>
            刷新
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as typeof activeTab)}
          items={[
            {
              key: 'all',
              label: `全部 (${items.length})`,
            },
            {
              key: 'review',
              label: (
                <span>
                  审核
                  {pendingCount.reviews > 0 && (
                    <Badge count={pendingCount.reviews} className="ml-1" />
                  )}
                </span>
              ),
            },
            {
              key: 'promotion',
              label: (
                <span>
                  推广
                  {pendingCount.promotions > 0 && (
                    <Badge count={pendingCount.promotions} className="ml-1" />
                  )}
                </span>
              ),
            },
            {
              key: 'report',
              label: (
                <span>
                  举报
                  {pendingCount.reports > 0 && (
                    <Badge count={pendingCount.reports} className="ml-1" />
                  )}
                </span>
              ),
            },
          ]}
        />

        <Spin spinning={reviewLoading || promotionsLoading || reportsLoading}>
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-gray-50"
                onClick={() => handleItemClick(item)}
              >
                <div className="flex-shrink-0">
                  {getTypeIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{item.title}</span>
                    {getStatusBadge(item.type, item.status)}
                  </div>
                  {item.subtitle && (
                    <Text type="secondary" className="text-sm block">
                      {item.subtitle}
                    </Text>
                  )}
                  <Text type="secondary" className="text-xs block">
                    {new Date(item.timestamp).toLocaleString('zh-CN')}
                  </Text>
                </div>
                <Button type="link" size="small" icon={<EyeOutlined />}>
                  查看
                </Button>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && !reviewLoading && !promotionsLoading && !reportsLoading && (
            <Empty
              description="暂无待处理事项"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
