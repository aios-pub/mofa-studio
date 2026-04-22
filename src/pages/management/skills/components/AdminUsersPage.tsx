/**
 * Admin Users Page
 * 管理员用户管理页面
 */

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Input,
  Select,
  message,
  Modal,
  Form,
  Switch,
} from 'antd';
import { SearchOutlined, UserSwitchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;

interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string;
  status: 'active' | 'inactive' | 'suspended';
  role: string;
  createdAt: string;
  lastLoginAt: string;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [form] = Form.useForm();

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockUsers: UserInfo[] = [
        {
          id: '1',
          username: 'admin',
          email: 'admin@example.com',
          displayName: '系统管理员',
          status: 'active',
          role: 'SUPER_ADMIN',
          createdAt: '2024-01-01',
          lastLoginAt: '2024-04-19',
        },
        {
          id: '2',
          username: 'user1',
          email: 'user1@example.com',
          displayName: '普通用户',
          status: 'active',
          role: 'USER',
          createdAt: '2024-01-15',
          lastLoginAt: '2024-04-18',
        },
      ];
      setUsers(mockUsers);
    } catch (error) {
      message.error('加载用户失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEdit = (user: UserInfo) => {
    setSelectedUser(user);
    form.setFieldsValue({
      status: user.status === 'active',
      role: user.role,
    });
    setEditModalVisible(true);
  };

  const handleUpdateUser = async () => {
    try {
      const values = await form.validateFields();
      // Mock update - replace with actual API call
      message.success('用户更新成功');
      setEditModalVisible(false);
      loadUsers();
    } catch (error) {
      message.error('更新失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'default';
      case 'suspended':
        return 'red';
      default:
        return 'default';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'red';
      case 'ADMIN':
        return 'orange';
      case 'USER':
        return 'blue';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<UserInfo> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '显示名称',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: '活跃', value: 'active' },
        { text: '未激活', value: 'inactive' },
        { text: '已暂停', value: 'suspended' },
      ],
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'active' ? '活跃' : status === 'inactive' ? '未激活' : '已暂停'}
        </Tag>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      filters: [
        { text: '超级管理员', value: 'SUPER_ADMIN' },
        { text: '管理员', value: 'ADMIN' },
        { text: '普通用户', value: 'USER' },
      ],
      render: (role: string) => {
        const roleNames: Record<string, string> = {
          SUPER_ADMIN: '超级管理员',
          ADMIN: '管理员',
          USER: '普通用户',
        };
        return <Tag color={getRoleColor(role)}>{roleNames[role] || role}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      sorter: (a, b) => new Date(a.lastLoginAt).getTime() - new Date(b.lastLoginAt).getTime(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: UserInfo) => (
        <Space>
          <Button
            type="link"
            icon={<UserSwitchOutlined />}
            onClick={() => handleEdit(record)}
          >
            管理
          </Button>
        </Space>
      ),
    },
  ];

  const filteredUsers = users.filter(user => {
    const matchSearch =
      !searchText ||
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase()) ||
      user.display_name.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !statusFilter || user.status === statusFilter;
    const matchRole = !roleFilter || user.role === roleFilter;
    return matchSearch && matchStatus && matchRole;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} className="m-0">
          用户管理
        </Title>
        <Text type="secondary">管理系统用户和权限</Text>
      </div>

      <div className="mb-4 flex gap-4">
        <Input
          placeholder="搜索用户名、邮箱或显示名称"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          placeholder="筛选状态"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          allowClear
        >
          <Option value="active">活跃</Option>
          <Option value="inactive">未激活</Option>
          <Option value="suspended">已暂停</Option>
        </Select>
        <Select
          placeholder="筛选角色"
          value={roleFilter}
          onChange={setRoleFilter}
          style={{ width: 150 }}
          allowClear
        >
          <Option value="SUPER_ADMIN">超级管理员</Option>
          <Option value="ADMIN">管理员</Option>
          <Option value="USER">普通用户</Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredUsers}
        loading={loading}
        rowKey="id"
        pagination={{
          total: filteredUsers.length,
          pageSize: 20,
          showSizeChanger: true,
          showTotal: total => `共 ${total} 个用户`,
        }}
      />

      <Modal
        title="管理用户"
        open={editModalVisible}
        onOk={handleUpdateUser}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        {selectedUser && (
          <Form form={form} layout="vertical">
            <Form.Item label="用户名">
              <Input value={selectedUser.username} disabled />
            </Form.Item>
            <Form.Item label="邮箱">
              <Input value={selectedUser.email} disabled />
            </Form.Item>
            <Form.Item
              label="状态"
              name="status"
              valuePropName="checked"
              initialValue={selectedUser.status === 'active'}
            >
              <Switch checkedChildren="活跃" unCheckedChildren="暂停" />
            </Form.Item>
            <Form.Item
              label="角色"
              name="role"
              initialValue={selectedUser.role}
            >
              <Select>
                <Option value="SUPER_ADMIN">超级管理员</Option>
                <Option value="ADMIN">管理员</Option>
                <Option value="USER">普通用户</Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
