/**
 * 角色管理页面
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  Tree,
  message,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageHeader, EmptyState } from '../../../components/common';
import type { SystemRole, RoleFormData, MenuItem } from '../../../types/system';
import { BasicStatus } from '../../../types/system';
import { roleApi, menuApi } from '../../../services/mock/system';

const { TextArea } = Input;

export default function RoleManagementPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);
  const [form] = Form.useForm<RoleFormData>();
  const [menuTree, setMenuTree] = useState<DataNode[]>([]);
  const [checkedMenuKeys, setCheckedMenuKeys] = useState<string[]>([]);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roleApi.getAll();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMenuTree = useCallback(async () => {
    try {
      const menus = await menuApi.getAll();
      const convertToTreeData = (items: MenuItem[]): DataNode[] => {
        return items.map(item => ({
          key: item.id,
          title: item.label,
          children: item.children ? convertToTreeData(item.children) : undefined,
        }));
      };
      setMenuTree(convertToTreeData(menus));
    } catch (error) {
      console.error('Failed to load menu tree:', error);
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadMenuTree();
  }, [loadRoles, loadMenuTree]);

  const handleCreate = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({
      status: BasicStatus.ENABLE,
      order: 0,
      permissions: [],
      menus: [],
    });
    setCheckedMenuKeys([]);
    setModalVisible(true);
  };

  const handleEdit = (record: SystemRole) => {
    setEditingRole(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      status: record.status,
      order: record.order,
      permissions: record.permissions,
      menus: record.menus,
    });
    setCheckedMenuKeys(record.menus);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await roleApi.delete(id);
      message.success('删除成功');
      loadRoles();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleMenuCheck = (checkedKeys: any) => {
    const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
    setCheckedMenuKeys(keys as string[]);
    form.setFieldValue('menus', keys);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRole) {
        await roleApi.update(editingRole.id, values);
        message.success('更新成功');
      } else {
        await roleApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadRoles();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<SystemRole> = [
    {
      title: t('role.name', '角色名称'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: t('role.code', '角色编码'),
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: t('role.description', '描述'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: t('role.order', '排序'),
      dataIndex: 'order',
      key: 'order',
      width: 80,
      align: 'center',
    },
    {
      title: t('role.status', '状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: BasicStatus) => (
        <Tag color={status === BasicStatus.ENABLE ? 'success' : 'error'}>
          {status === BasicStatus.ENABLE ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: t('role.createdAt', '创建时间'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: Date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: t('common.actions', '操作'),
      key: 'action',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个角色吗？"
            description="删除后无法恢复，该角色下的用户将失去相关权限。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 预设权限选项
  const permissionOptions = [
    { value: 'all', label: '全部权限' },
    { value: 'manage_users', label: '用户管理' },
    { value: 'manage_roles', label: '角色管理' },
    { value: 'manage_menus', label: '菜单管理' },
    { value: 'manage_agents', label: 'Agent管理' },
    { value: 'manage_prompts', label: '提示词管理' },
    { value: 'manage_skills', label: '技能管理' },
    { value: 'manage_testsets', label: '测试集管理' },
    { value: 'manage_settings', label: '系统设置' },
    { value: 'use_agents', label: '使用Agent' },
    { value: 'view_conversations', label: '查看对话' },
    { value: 'view_agents', label: '查看Agent' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('role.management', '角色管理')}
        description={t('role.description', '管理系统角色和权限分配')}
        icon={<TeamOutlined className="text-xl" />}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建角色
          </Button>
        }
      />

      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[var(--color-text-tertiary)]">加载中...</div>
          </div>
        ) : roles.length === 0 ? (
          <EmptyState
            type="user"
            title="暂无角色"
            description="点击上方按钮创建第一个角色"
          />
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={roles}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个角色`,
            }}
          />
        )}
      </div>

      {/* 角色编辑弹窗 */}
      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={650}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="角色名称"
              rules={[{ required: true, message: '请输入角色名称' }]}
            >
              <Input placeholder="例如：系统管理员" />
            </Form.Item>

            <Form.Item
              name="code"
              label="角色编码"
              rules={[
                { required: true, message: '请输入角色编码' },
                { pattern: /^[a-z_]+$/, message: '只能包含小写字母和下划线' },
              ]}
            >
              <Input placeholder="例如：admin" disabled={!!editingRole} />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="角色描述"
          >
            <TextArea rows={2} placeholder="描述角色的职责和权限范围" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="order"
              label="排序"
              initialValue={0}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>

            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: BasicStatus.ENABLE, label: '启用' },
                  { value: BasicStatus.DISABLE, label: '禁用' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="permissions"
            label="功能权限"
          >
            <Select
              mode="multiple"
              placeholder="选择功能权限"
              options={permissionOptions}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="menus"
            label="菜单权限"
            help="选择角色可访问的菜单"
          >
            <div className="border border-[var(--color-border)] rounded-lg p-3 max-h-64 overflow-auto bg-[var(--color-bg-tertiary)]">
              {menuTree.length > 0 ? (
                <Tree
                  checkable
                  checkedKeys={checkedMenuKeys}
                  treeData={menuTree}
                  onCheck={handleMenuCheck}
                  defaultExpandAll
                />
              ) : (
                <div className="text-center text-[var(--color-text-tertiary)] py-4">
                  暂无菜单数据
                </div>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
