/**
 * 用户管理页面
 * 使用 Ant Design 组件重构
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Select,
  Button,
  Tag,
  Space,
  Input,
  Modal,
  Form,
  Dropdown,
  Typography,
  Avatar,
  Tooltip,
  Popconfirm,
  message,
} from 'antd';
import {
  SearchOutlined,
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/common';
import type { User as UserType } from '@/services';
import { organizationApi } from '@/services';
import { formatDate } from '@/utils';

const { Text } = Typography;

const roleLabels: Record<UserType['role'], string> = {
  admin: '管理员',
  manager: '经理',
  user: '普通用户',
};

const roleColors: Record<UserType['role'], string> = {
  admin: 'purple',
  manager: 'blue',
  user: 'default',
};

const statusLabels: Record<UserType['status'], string> = {
  active: '正常',
  inactive: '禁用',
  pending: '待激活',
};

const statusColors: Record<UserType['status'], string> = {
  active: 'success',
  inactive: 'error',
  pending: 'warning',
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [form] = Form.useForm();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await organizationApi.getUsers({
        department: filterDepartment || undefined,
        status: filterStatus || undefined,
        role: filterRole || undefined,
      });
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [filterDepartment, filterStatus, filterRole]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 获取所有部门
  const departments = [...new Set(users.map((u) => u.department))];

  // 过滤用户
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.department.toLowerCase().includes(query)
    );
  });

  const handleBatchUpdateStatus = async (status: UserType['status']) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要操作的用户');
      return;
    }
    await organizationApi.batchUpdateStatus(selectedRowKeys as string[], status);
    setSelectedRowKeys([]);
    message.success(`已批量${statusLabels[status]} ${selectedRowKeys.length} 个用户`);
    loadUsers();
  };

  const handleDeleteUser = async (id: string) => {
    await organizationApi.deleteUser(id);
    message.success('用户已删除');
    loadUsers();
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      status: user.status,
    });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await organizationApi.updateUser(editingUser.id, values);
        message.success('用户已更新');
      } else {
        await organizationApi.createUser(values);
        message.success('用户已创建');
      }
      handleModalClose();
      loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // 表格列配置
  const columns: ColumnsType<UserType> = [
    {
      title: t('user.userName', '用户'),
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar
            style={{ backgroundColor: 'var(--color-primary)' }}
            icon={<UserOutlined />}
          >
            {record.name.charAt(0)}
          </Avatar>
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" className="text-xs">
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('user.department', '部门'),
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: t('user.role', '角色'),
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserType['role']) => (
        <Tag color={roleColors[role]}>{roleLabels[role]}</Tag>
      ),
    },
    {
      title: t('user.status', '状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UserType['status']) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '使用量',
      key: 'usage',
      width: 140,
      render: (_, record) => (
        <div className="text-xs">
          <div>{record.usage.totalConversations} 对话</div>
          <div>{formatNumber(record.usage.totalTokens)} tokens</div>
        </div>
      ),
    },
    {
      title: t('user.lastLogin', '最后登录'),
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 120,
      render: (date: Date) => (
        <Text type="secondary" className="text-xs">
          {date ? formatDate(date) : '-'}
        </Text>
      ),
    },
    {
      title: t('common.actions', '操作'),
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(record);
              }}
            />
          </Tooltip>
          <Popconfirm
            title={t('user.deleteConfirm', '确定要删除这个用户吗？')}
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDeleteUser(record.id);
            }}
            okText={t('common.confirm', '确认')}
            cancelText={t('common.cancel', '取消')}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 批量操作菜单
  const batchMenuItems = [
    {
      key: 'active',
      label: '批量激活',
      onClick: () => handleBatchUpdateStatus('active'),
    },
    {
      key: 'inactive',
      label: '批量禁用',
      onClick: () => handleBatchUpdateStatus('inactive'),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('user.title', '用户管理')}
        description="管理系统用户和权限"
        icon={<UserOutlined className="text-xl" />}
        actions={
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setModalOpen(true)}
          >
            {t('user.createUser', '添加用户')}
          </Button>
        }
      />

      {/* 筛选区域 */}
      <Card size="small">
        <Space wrap>
          <Input
            placeholder={t('common.search', '搜索用户...')}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="选择部门"
            value={filterDepartment || undefined}
            onChange={setFilterDepartment}
            allowClear
            style={{ width: 140 }}
            options={departments.map((dept) => ({
              label: dept,
              value: dept,
            }))}
          />
          <Select
            placeholder="选择状态"
            value={filterStatus || undefined}
            onChange={setFilterStatus}
            allowClear
            style={{ width: 120 }}
            options={Object.entries(statusLabels).map(([value, label]) => ({
              label,
              value,
            }))}
          />
          <Select
            placeholder="选择角色"
            value={filterRole || undefined}
            onChange={setFilterRole}
            allowClear
            style={{ width: 120 }}
            options={Object.entries(roleLabels).map(([value, label]) => ({
              label,
              value,
            }))}
          />
          {selectedRowKeys.length > 0 && (
            <Dropdown menu={{ items: batchMenuItems }} placement="bottomRight">
              <Button>
                批量操作 ({selectedRowKeys.length})
              </Button>
            </Dropdown>
          )}
        </Space>
      </Card>

      {/* 用户表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t('pagination.total', `共 ${total} 条`, { total }),
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          locale={{
            emptyText: t('user.noUsers', '暂无用户数据'),
          }}
        />
      </Card>

      {/* 创建/编辑用户弹窗 */}
      <Modal
        title={editingUser ? t('user.editUser', '编辑用户') : t('user.createUser', '添加用户')}
        open={modalOpen}
        onCancel={handleModalClose}
        onOk={handleSave}
        okText={t('common.save', '保存')}
        cancelText={t('common.cancel', '取消')}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'user',
            status: 'active',
          }}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item name="department" label="部门">
            <Select
              placeholder="选择部门"
              allowClear
              options={departments.map((dept) => ({
                label: dept,
                value: dept,
              }))}
            />
          </Form.Item>

          <Form.Item name="role" label="角色">
            <Select
              options={Object.entries(roleLabels).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </Form.Item>

          {editingUser && (
            <Form.Item name="status" label="状态">
              <Select
                options={Object.entries(statusLabels).map(([value, label]) => ({
                  label,
                  value,
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
