/**
 * 菜单管理页面
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  message,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { PageHeader, EmptyState } from "../../../components/common";
import type { MenuItem, MenuFormData } from "../../../types/system";
import { MenuType, BasicStatus } from "../../../types/system";
import { menuApi } from "@/services";

const { TextArea } = Input;

export default function MenuManagementPage() {
  const { t } = useTranslation();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [form] = Form.useForm<MenuFormData>();
  const [flatMenus, setFlatMenus] = useState<MenuItem[]>([]);

  const loadMenus = useCallback(async () => {
    try {
      setLoading(true);
      const [treeData, flatData] = await Promise.all([
        menuApi.getAll(),
        menuApi.getFlatList(),
      ]);
      setMenus(treeData);
      setFlatMenus(flatData);
    } catch (error) {
      console.error("Failed to load menus:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const handleCreate = (parentId?: string) => {
    setEditingMenu(null);
    form.resetFields();
    form.setFieldsValue({
      parentId: parentId || null,
      type: MenuType.MENU,
      status: BasicStatus.ENABLE,
      order: 0,
      hide: false,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: MenuItem) => {
    setEditingMenu(record);
    form.setFieldsValue({
      parentId: record.parentId,
      name: record.name,
      label: record.label,
      path: record.path,
      component: record.component,
      icon: record.icon,
      type: record.type,
      order: record.order,
      status: record.status,
      hide: record.hide,
      externalLink: record.externalLink,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await menuApi.delete(id);
      message.success("删除成功");
      loadMenus();
    } catch (error) {
      message.error("删除失败");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingMenu) {
        await menuApi.update(editingMenu.id, values);
        message.success("更新成功");
      } else {
        await menuApi.create(values);
        message.success("创建成功");
      }
      setModalVisible(false);
      loadMenus();
    } catch (error) {
      message.error("操作失败");
    }
  };

  const columns: ColumnsType<MenuItem> = [
    {
      title: t("menu.name", "菜单名称"),
      dataIndex: "label",
      key: "label",
      width: 200,
    },
    {
      title: t("menu.type", "类型"),
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type: MenuType) => {
        const typeMap = {
          [MenuType.CATALOGUE]: { text: "目录", color: "blue" },
          [MenuType.MENU]: { text: "菜单", color: "green" },
          [MenuType.BUTTON]: { text: "按钮", color: "orange" },
        };
        const config = typeMap[type];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: t("menu.icon", "图标"),
      dataIndex: "icon",
      key: "icon",
      width: 100,
      render: (icon: string) => icon || "-",
    },
    {
      title: t("menu.path", "路径"),
      dataIndex: "path",
      key: "path",
      width: 180,
      render: (path: string) => path || "-",
    },
    {
      title: t("menu.component", "组件"),
      dataIndex: "component",
      key: "component",
      width: 150,
      render: (component: string) => component || "-",
    },
    {
      title: t("menu.order", "排序"),
      dataIndex: "order",
      key: "order",
      width: 80,
      align: "center",
    },
    {
      title: t("menu.status", "状态"),
      dataIndex: "status",
      key: "status",
      width: 100,
      align: "center",
      render: (status: BasicStatus) => (
        <Tag color={status === BasicStatus.ENABLE ? "success" : "error"}>
          {status === BasicStatus.ENABLE ? "启用" : "禁用"}
        </Tag>
      ),
    },
    {
      title: t("menu.hide", "隐藏"),
      dataIndex: "hide",
      key: "hide",
      width: 80,
      align: "center",
      render: (hide: boolean) => (hide ? "是" : "否"),
    },
    {
      title: t("common.actions", "操作"),
      key: "action",
      width: 180,
      align: "center",
      render: (_, record) => (
        <Space size="small">
          {record.type === MenuType.CATALOGUE && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleCreate(record.id)}
            >
              新增
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个菜单吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 父菜单选项
  const parentMenuOptions = [
    {
      value: null,
      label: "顶级菜单",
    },
    ...flatMenus
      .filter((m) => m.type === MenuType.CATALOGUE)
      .map((m) => ({
        value: m.id,
        label: m.label,
      })),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("menu.management", "菜单管理")}
        description={t("menu.description", "管理系统菜单和权限配置")}
        icon={<MenuOutlined className="text-xl" />}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleCreate()}
          >
            新建菜单
          </Button>
        }
      />

      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[var(--color-text-tertiary)]">加载中...</div>
          </div>
        ) : menus.length === 0 ? (
          <EmptyState
            type="settings"
            title="暂无菜单"
            description="点击上方按钮创建第一个菜单"
          />
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={menus}
            pagination={false}
            defaultExpandAllRows
            indentSize={20}
          />
        )}
      </div>

      {/* 菜单编辑弹窗 */}
      <Modal
        title={editingMenu ? "编辑菜单" : "新建菜单"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="parentId" label="上级菜单">
            <Select
              placeholder="请选择上级菜单"
              options={parentMenuOptions}
              allowClear
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="菜单名称（英文）"
              rules={[{ required: true, message: "请输入菜单名称" }]}
            >
              <Input placeholder="例如：menu-management" />
            </Form.Item>

            <Form.Item
              name="label"
              label="菜单标题"
              rules={[{ required: true, message: "请输入菜单标题" }]}
            >
              <Input placeholder="例如：菜单管理" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="type"
              label="菜单类型"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: MenuType.CATALOGUE, label: "目录" },
                  { value: MenuType.MENU, label: "菜单" },
                  { value: MenuType.BUTTON, label: "按钮" },
                ]}
              />
            </Form.Item>

            <Form.Item name="icon" label="图标">
              <Input placeholder="例如：MenuOutlined" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="path" label="路由路径">
              <Input placeholder="例如：/system/menu" />
            </Form.Item>

            <Form.Item name="component" label="组件路径">
              <Input placeholder="例如：system/menu/index" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="order" label="排序" initialValue={0}>
              <InputNumber min={0} className="w-full" />
            </Form.Item>

            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: BasicStatus.ENABLE, label: "启用" },
                  { value: BasicStatus.DISABLE, label: "禁用" },
                ]}
              />
            </Form.Item>

            <Form.Item name="hide" label="是否隐藏" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <Form.Item name="externalLink" label="外链地址">
            <Input placeholder="如果是外链，请填写完整URL" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="菜单描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
