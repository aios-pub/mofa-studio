/**
 * My Stars Page
 * 显示当前用户收藏的技能
 */

import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Tooltip,
  Row,
  Col,
  Statistic,
  Empty,
} from 'antd';
import {
  StarFilled,
  EyeOutlined,
  StarOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from '@tanstack/react-router';
import { skillHubV2Api } from '@/services';
import type { HubSkill } from '@/types/skill';

export function MyStarsPage() {
  const navigate = useNavigate();
  const [myStars, setMyStars] = useState<HubSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [categorizedStars, setCategorizedStars] = useState<Record<string, HubSkill[]>>({});

  useEffect(() => {
    loadMyStars();
  }, []);

  const loadMyStars = async () => {
    setLoading(true);
    try {
      // Call the search API - backend filters by user's stars
      const result = await skillHubV2Api.search({
        page: 0,
        size: 100,
        sort: 'popular',
      });

      setMyStars(result.skills || []);

      // Categorize by namespace
      const categorized: Record<string, HubSkill[]> = {};
      result.skills.forEach(skill => {
        const ns = skill.namespaceSlug;
        if (!categorized[ns]) {
          categorized[ns] = [];
        }
        categorized[ns].push(skill);
      });
      setCategorizedStars(categorized);
    } catch (error) {
      console.error('Failed to load my stars:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstar = async (skillId: string) => {
    try {
      await skillHubV2Api.unstarSkill(skillId);
      loadMyStars();
    } catch (error) {
      console.error('Failed to unstar:', error);
    }
  };

  const stats = {
    total: myStars.length,
    namespaces: Object.keys(categorizedStars).length,
    totalDownloads: myStars.reduce((sum, s) => sum + s.downloadCount, 0),
  };

  const columns = [
    {
      title: '技能',
      key: 'skill',
      render: (_: unknown, record: HubSkill) => (
        <Space direction="vertical" size={0}>
          <div className="font-medium">{record.displayName || record.slug}</div>
          <div className="text-xs text-gray-500">
            {record.namespaceSlug}/{record.slug}
          </div>
          {record.summary && (
            <div className="text-xs text-gray-400 line-clamp-2 mt-1">
              {record.summary}
            </div>
          )}
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'labels',
      key: 'labels',
      render: (labels: any[]) => (
        <Space size={4} wrap>
          {labels?.slice(0, 3).map(label => (
            <Tag key={label.id} color="blue" className="text-xs">
              {label.displayName}
            </Tag>
          ))}
          {labels && labels.length > 3 && (
            <Tag className="text-xs">+{labels.length - 3}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '版本',
      key: 'version',
      width: 100,
      render: (_: unknown, record: HubSkill) => (
        <Tag color="green">{record.latestVersion?.version || '-'}</Tag>
      ),
    },
    {
      title: '评分',
      key: 'rating',
      width: 120,
      render: (_: unknown, record: HubSkill) => (
        <Space size="small">
          <span className="text-yellow-500">★</span>
          <span>{record.ratingAvg.toFixed(1)}</span>
          <span className="text-xs text-gray-500">({record.ratingCount})</span>
        </Space>
      ),
    },
    {
      title: '下载',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      width: 80,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: HubSkill) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate({ to: `/skills/hub/${record.namespaceSlug}/${record.slug}` })}
            />
          </Tooltip>
          <Tooltip title="下载">
            <Button
              type="text"
              size="small"
              icon={<CloudDownloadOutlined />}
            />
          </Tooltip>
          <Tooltip title="取消收藏">
            <Button
              type="text"
              size="small"
              icon={<StarOutlined />}
              onClick={() => handleUnstar(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card>
            <Statistic
              title="收藏技能"
              value={stats.total}
              prefix={<StarFilled className="text-yellow-500" />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="涉及命名空间"
              value={stats.namespaces}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="总下载量"
              value={stats.totalDownloads}
            />
          </Card>
        </Col>
      </Row>

      {Object.entries(categorizedStars).map(([namespace, skills]) => (
        <Card
          key={namespace}
          title={
            <Space>
              <span className="font-medium">{namespace}</span>
              <Tag color="blue">{skills.length}</Tag>
            </Space>
          }
          className="mb-4"
        >
          <Table
            columns={columns}
            dataSource={skills}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="small"
          />
        </Card>
      ))}

      {myStars.length === 0 && !loading && (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <p className="mb-4">还没有收藏任何技能</p>
                <Button type="primary" onClick={() => navigate({ to: '/skills/hub' })}>
                  去探索技能
                </Button>
              </div>
            }
          />
        </Card>
      )}
    </div>
  );
}
