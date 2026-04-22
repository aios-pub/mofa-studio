/**
 * My Skills Page
 * 显示当前用户拥有的技能
 */

import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Tooltip,
  Progress,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  CloudUploadOutlined,
  StarFilled,
  StarOutlined,
  DeleteOutlined,
  CopyOutlined,
  InboxOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { skillHubV2Api } from "@/services";
import type { HubSkill, SkillStatus } from "@/types/skill";
import { useSkillHubStore } from "@/stores/useSkillHubStore";

export function MySkillsPage() {
  const navigate = useNavigate();
  const [mySkills, setMySkills] = useState<HubSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "active" | "hidden" | "archived"
  >("all");
  const [actionLoading, setActionLoading] = useState<string>("");

  const { archiveSkill, unarchiveSkill } = useSkillHubStore();

  useEffect(() => {
    loadMySkills();
  }, []);

  const loadMySkills = async () => {
    setLoading(true);
    try {
      // Call the search API - backend filters by owner
      const result = await skillHubV2Api.search({
        page: 0,
        size: 100,
      });
      setMySkills(result.skills || []);
    } catch (error) {
      console.error("Failed to load my skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStar = async (skillId: string) => {
    try {
      await skillHubV2Api.starSkill(skillId);
      loadMySkills();
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const getStatusColor = (status: SkillStatus) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "HIDDEN":
        return "warning";
      case "ARCHIVED":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusText = (status: SkillStatus) => {
    switch (status) {
      case "ACTIVE":
        return "活跃";
      case "HIDDEN":
        return "隐藏";
      case "ARCHIVED":
        return "归档";
      default:
        return status;
    }
  };

  const filteredSkills = mySkills.filter((skill) => {
    if (filter === "all") return true;
    return skill.status.toLowerCase() === filter;
  });

  const stats = {
    total: mySkills.length,
    active: mySkills.filter((s) => s.status === "ACTIVE").length,
    hidden: mySkills.filter((s) => s.status === "HIDDEN").length,
    archived: mySkills.filter((s) => s.status === "ARCHIVED").length,
    totalDownloads: mySkills.reduce((sum, s) => sum + s.download_count, 0),
    totalStars: mySkills.reduce((sum, s) => sum + s.star_count, 0),
  };

  const columns = [
    {
      title: "技能",
      key: "skill",
      render: (_: unknown, record: HubSkill) => (
        <Space direction="vertical" size={0}>
          <div className="font-medium">{record.display_name || record.slug}</div>
          <div className="text-xs text-gray-500">
            {record.namespace_slug}/{record.slug}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {record.labels?.slice(0, 3).map((label) => (
              <Tag key={label.id} color="blue" className="text-xs">
                {label.display_name}
              </Tag>
            ))}
            {record.labels && record.labels.length > 3 && (
              <Tag className="text-xs">+{record.labels.length - 3}</Tag>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: SkillStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: "版本",
      key: "version",
      width: 120,
      render: (_: unknown, record: HubSkill) => (
        <div className="text-sm">
          <div>最新: {record.latest_version?.version || "-"}</div>
          <div className="text-xs text-gray-500">
            {record.latest_version?.status || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "统计",
      key: "stats",
      width: 150,
      render: (_: unknown, record: HubSkill) => (
        <Space size="large" className="text-sm">
          <Tooltip title="下载次数">
            <Space size={4}>
              <span>⬇</span>
              <span>{record.download_count}</span>
            </Space>
          </Tooltip>
          <Tooltip title="Star 数">
            <Space size={4}>
              <span>★</span>
              <span>{record.star_count}</span>
            </Space>
          </Tooltip>
          {record.rating_count > 0 && (
            <Tooltip
              title={`评分: ${record.rating_avg.toFixed(1)} (${record.rating_count}个评分)`}
            >
              <Space size={4}>
                <span>☆</span>
                <span>{record.rating_avg.toFixed(1)}</span>
              </Space>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "可见性",
      dataIndex: "visibility",
      key: "visibility",
      width: 120,
      render: (visibility: string) => {
        const config: Record<string, { color: string; text: string }> = {
          PUBLIC: { color: "green", text: "公开" },
          NAMESPACE_ONLY: { color: "blue", text: "命名空间" },
          PRIVATE: { color: "default", text: "私有" },
        };
        const c = config[visibility] || { color: "default", text: visibility };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 200,
      render: (_: unknown, record: HubSkill) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                navigate({
                  to: `/skills/hub/${record.namespace_slug}/${record.slug}`,
                })
              }
            />
          </Tooltip>
          <Tooltip title={record.star_count > 0 ? "取消 Star" : "Star"}>
            <Button
              type="text"
              size="small"
              icon={record.star_count > 0 ? <StarFilled /> : <StarOutlined />}
              onClick={() => handleToggleStar(record.id)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} />
          </Tooltip>
          <Tooltip title="发布新版本">
            <Button
              type="text"
              size="small"
              icon={<CloudUploadOutlined />}
              onClick={() => navigate({ to: "/skills/publish" })}
            />
          </Tooltip>
          {record.status === "ACTIVE" && (
            <Tooltip title="归档">
              <Button
                type="text"
                size="small"
                danger
                icon={<InboxOutlined />}
                loading={actionLoading === `archive-${record.id}`}
                onClick={async () => {
                  setActionLoading(`archive-${record.id}`);
                  try {
                    await archiveSkill(record.namespace_slug, record.slug);
                    loadMySkills();
                  } catch (error) {
                    console.error("Archive failed:", error);
                  } finally {
                    setActionLoading("");
                  }
                }}
              />
            </Tooltip>
          )}
          {record.status === "ARCHIVED" && (
            <Tooltip title="恢复">
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                loading={actionLoading === `unarchive-${record.id}`}
                onClick={async () => {
                  setActionLoading(`unarchive-${record.id}`);
                  try {
                    await unarchiveSkill(record.namespace_slug, record.slug);
                    loadMySkills();
                  } catch (error) {
                    console.error("Unarchive failed:", error);
                  } finally {
                    setActionLoading("");
                  }
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Row gutter={16} className="mb-6">
        <Col span={4}>
          <Card>
            <Statistic title="总技能数" value={stats.total} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="活跃"
              value={stats.active}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="总下载" value={stats.totalDownloads} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="总 Stars"
              value={stats.totalStars}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="已隐藏" value={stats.hidden} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="已归档" value={stats.archived} />
          </Card>
        </Col>
      </Row>

      <Card
        title="我的技能"
        extra={
          <Space>
            <Space.Compact>
              <Button
                type={filter === "all" ? "primary" : "default"}
                onClick={() => setFilter("all")}
              >
                全部
              </Button>
              <Button
                type={filter === "active" ? "primary" : "default"}
                onClick={() => setFilter("active")}
              >
                活跃
              </Button>
              <Button
                type={filter === "hidden" ? "primary" : "default"}
                onClick={() => setFilter("hidden")}
              >
                隐藏
              </Button>
              <Button
                type={filter === "archived" ? "primary" : "default"}
                onClick={() => setFilter("archived")}
              >
                归档
              </Button>
            </Space.Compact>
            <Button type="primary" icon={<CloudUploadOutlined />}>
              发布新技能
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredSkills}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个技能`,
          }}
        />
      </Card>
    </div>
  );
}
