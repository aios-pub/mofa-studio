import { useTranslation } from "react-i18next";
/**
 * Namespace Manager Component
 * Manage namespaces and members
 */

import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { skillHubV2Api } from "@/services";
import type { HubNamespace, NamespaceMember, TenantUser } from "@/types/skill";

export function NamespaceManager() {  const { t } = useTranslation();

  const [namespaces, setNamespaces] = useState<HubNamespace[]>([]);
  const [members, setMembers] = useState<Record<number, NamespaceMember[]>>({});
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [selectedNamespace, setSelectedNamespace] =
    useState<HubNamespace | null>(null);
  const [form] = Form.useForm();
  const [memberForm] = Form.useForm();

  useEffect(() => {
    loadNamespaces();
    loadTenantUsers();
  }, []);

  const loadNamespaces = async () => {
    setLoading(true);
    try {
      const data = await skillHubV2Api.listNamespaces();
      setNamespaces(data);

      // Load members for each namespace
      for (const ns of data) {
        const nsMembers = await skillHubV2Api.listMembers(ns.id);
        setMembers((prev) => ({ ...prev, [parseInt(ns.id)]: nsMembers }));
      }
    } catch (error) {
      message.error(t("加载命名空间失败"));
    } finally {
      setLoading(false);
    }
  };

  const loadTenantUsers = async () => {
    try {
      const users = await skillHubV2Api.listTenantUsers();
      setTenantUsers(users);
    } catch (error) {
      message.error(t("加载用户列表失败"));
    }
  };

  const handleCreateNamespace = async (values: any) => {
    try {
      await skillHubV2Api.createNamespace(values);
      message.success(t("命名空间创建成功"));
      setCreateModalVisible(false);
      form.resetFields();
      loadNamespaces();
    } catch (error) {
      message.error(t("创建失败"));
    }
  };

  const handleAddMember = async (values: any) => {
    if (!selectedNamespace) return;

    try {
      await skillHubV2Api.addMember(
        selectedNamespace.id,
        values.user_id,
        values.role,
      );
      message.success(t("成员添加成功"));
      setMemberModalVisible(false);
      memberForm.resetFields();
      loadNamespaces();
    } catch (error) {
      message.error(t("添加成员失败"));
    }
  };

  const handleRemoveMember = async (namespaceId: number, userId: string) => {
    try {
      await skillHubV2Api.removeMember(String(namespaceId), userId);
      message.success(t("成员移除成功"));
      loadNamespaces();
    } catch (error) {
      message.error(t("移除成员失败"));
    }
  };

  const namespaceColumns = [
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      render: (slug: string) => <code>{slug}</code>,
    },
    {
      title: t("显示名称"),
      dataIndex: "display_name",
      key: "displayName",
    },
    {
      title: t("类型"),
      dataIndex: "type",
      key: "type",
      render: (type: string) => {
        const colors: Record<string, string> = {
          GLOBAL: "blue",
          TEAM: "green",
          PERSONAL: "orange",
        };
        return <Tag color={colors[type]}>{type}</Tag>;
      },
    },
    {
      title: t("成员数"),
      key: "memberCount",
      render: (_: any, record: HubNamespace) => (
        <Space>
          <TeamOutlined />
          {members[parseInt(record.id)]?.length || 0}
        </Space>
      ),
    },
    {
      title: t("状态"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "ACTIVE" ? "green" : "red"}>{status}</Tag>
      ),
    },
    {
      title: t("操作"),
      key: "actions",
      render: (_: any, record: HubNamespace) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<TeamOutlined />}
            onClick={() => {
              setSelectedNamespace(record);
              setMemberModalVisible(true);
            }}
          >
            管理成员
          </Button>
        </Space>
      ),
    },
  ];

  const memberColumns = [
    {
      title: t("用户 ID"),
      dataIndex: "user_id",
      key: "userId",
    },
    {
      title: t("角色"),
      dataIndex: "role",
      key: "role",
      render: (role: string) => {
        const colors: Record<string, string> = {
          OWNER: "red",
          ADMIN: "orange",
          MEMBER: "blue",
          VIEWER: "default",
        };
        return <Tag color={colors[role]}>{role}</Tag>;
      },
    },
    {
      title: t("添加时间"),
      dataIndex: "created_at",
      key: "addedAt",
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t("操作"),
      key: "actions",
      render: (_: any, record: NamespaceMember) => (
        <Popconfirm
          title={t("确认移除该成员？")}
          onConfirm={() =>
            handleRemoveMember(parseInt(selectedNamespace!.id), record.user_id)
          }
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const memberList = selectedNamespace
    ? members[parseInt(selectedNamespace.id)] || []
    : [];

  return (
    <div className="p-6">
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title={t("命名空间总数")}
              value={namespaces.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t("全局命名空间")}
              value={namespaces.filter((ns) => ns.type === "GLOBAL").length}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t("团队命名空间")}
              value={namespaces.filter((ns) => ns.type === "TEAM").length}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t("总成员数")}
              value={Object.values(members).flat().length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={t("命名空间列表")}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建命名空间
          </Button>
        }
      >
        <Table
          columns={namespaceColumns}
          dataSource={namespaces}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* Create Namespace Modal */}
      <Modal
        title={t("创建命名空间")}
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateNamespace}>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: t("请输入 slug") },
              {
                pattern: /^[a-z0-9-]+$/,
                message: t("只能包含小写字母、数字和连字符"),
              },
            ]}
          >
            <Input placeholder="my-namespace" />
          </Form.Item>
          <Form.Item
            name="displayName"
            label={t("显示名称")}
            rules={[{ required: true, message: t("请输入显示名称") }]}
          >
            <Input placeholder="My Namespace" />
          </Form.Item>
          <Form.Item
            name="type"
            label={t("类型")}
            rules={[{ required: true, message: t("请选择类型") }]}
          >
            <Select>
              <Select.Option value="GLOBAL">{t("全局")}</Select.Option>
              <Select.Option value="TEAM">{t("团队")}</Select.Option>
              <Select.Option value="PERSONAL">{t("个人")}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label={t("描述")}>
            <Input.TextArea rows={3} placeholder={t("可选的描述信息")} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Manage Members Modal */}
      <Modal
        title={`管理成员 - ${selectedNamespace?.display_name || selectedNamespace?.slug}`}
        open={memberModalVisible}
        onCancel={() => {
          setMemberModalVisible(false);
          setSelectedNamespace(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={memberForm}
          layout="inline"
          onFinish={handleAddMember}
          className="mb-4"
        >
          <Form.Item
            name="userId"
            rules={[{ required: true, message: t("请选择用户") }]}
          >
            <Select
              style={{ width: 240 }}
              placeholder={t("选择用户")}
              showSearch
              optionFilterProp="label"
              options={tenantUsers.map((user) => ({
                value: user.id,
                label: `${user.nickname || user.username}${user.email ? ` (${user.email})` : ""}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="role"
            rules={[{ required: true, message: t("请选择角色") }]}
          >
            <Select style={{ width: 120 }} placeholder={t("角色")}>
              <Select.Option value="OWNER">{t("所有者")}</Select.Option>
              <Select.Option value="ADMIN">{t("管理员")}</Select.Option>
              <Select.Option value="MEMBER">{t("成员")}</Select.Option>
              <Select.Option value="VIEWER">{t("观察者")}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<UserAddOutlined />}>
              添加成员
            </Button>
          </Form.Item>
        </Form>

        <Table
          columns={memberColumns}
          dataSource={memberList}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
}
