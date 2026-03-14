/**
 * 用户管理页面
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Edit2,
  Trash2,
  User,
  XCircle,
  Loader2,
  UserPlus,
} from 'lucide-react';
import type { User as UserType } from '../../services/mock/organization';
import { organizationApi } from '../../services/mock/organization';
import { useFrontendPagination } from '../../hooks/usePagination';
import Pagination from '../../components/common/Pagination';

const roleLabels: Record<UserType['role'], string> = {
  admin: '管理员',
  manager: '经理',
  user: '普通用户',
};

const statusLabels: Record<UserType['status'], string> = {
  active: '正常',
  inactive: '禁用',
  pending: '待激活',
};

const statusColors: Record<UserType['status'], string> = {
  active: 'bg-green-500/10 text-green-500',
  inactive: 'bg-red-500/10 text-red-500',
  pending: 'bg-yellow-500/10 text-yellow-500',
};

const roleColors: Record<UserType['role'], string> = {
  admin: 'bg-purple-500/10 text-purple-500',
  manager: 'bg-blue-500/10 text-blue-500',
  user: 'bg-gray-500/10 text-gray-500',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

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

  // 使用前端分页
  const {
    data: paginatedUsers,
    page,
    pageSize,
    total,
    onChange: handlePageChange,
  } = useFrontendPagination(filteredUsers, 10);

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const handleSelectUser = (id: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUsers(newSelected);
  };

  const handleBatchUpdateStatus = async (status: UserType['status']) => {
    if (selectedUsers.size === 0) return;
    await organizationApi.batchUpdateStatus(Array.from(selectedUsers), status);
    setSelectedUsers(new Set());
    loadUsers();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;
    await organizationApi.deleteUser(id);
    loadUsers();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">用户管理</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">管理系统用户和权限</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
          >
            <UserPlus className="w-4 h-4" />
            添加用户
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-3">
          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="搜索用户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-64 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          {/* 筛选 */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
          >
            <option value="">全部部门</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
          >
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="inactive">禁用</option>
            <option value="pending">待激活</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
          >
            <option value="">全部角色</option>
            <option value="admin">管理员</option>
            <option value="manager">经理</option>
            <option value="user">普通用户</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-secondary)]">
                已选择 {selectedUsers.size} 个用户
              </span>
              <button
                onClick={() => handleBatchUpdateStatus('active')}
                className="px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded hover:bg-green-500/20"
              >
                激活
              </button>
              <button
                onClick={() => handleBatchUpdateStatus('inactive')}
                className="px-2 py-1 text-xs bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"
              >
                禁用
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 用户列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
              <tr>
                <th className="py-3 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-[var(--color-border)]"
                  />
                </th>
                <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">用户</th>
                <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">部门</th>
                <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">角色</th>
                <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">状态</th>
                <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">使用量</th>
                <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">最后登录</th>
                <th className="py-3 px-4 text-right text-[var(--color-text-tertiary)] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-secondary)]"
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-[var(--color-border)]"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-[var(--color-primary)]">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text-primary)]">{user.name}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[var(--color-text-secondary)]">{user.department}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${roleColors[user.role]}`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[user.status]}`}>
                      {statusLabels[user.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-xs text-[var(--color-text-tertiary)]">
                      <p>{user.usage.totalConversations} 对话</p>
                      <p>{formatNumber(user.usage.totalTokens)} tokens</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--color-text-tertiary)]">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 hover:bg-[var(--color-bg-tertiary)] rounded"
                      >
                        <Edit2 className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 分页 */}
        {!loading && filteredUsers.length > 0 && (
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={handlePageChange}
          />
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-tertiary)]">
            <User className="w-12 h-12 mb-2 opacity-50" />
            <p>暂无用户数据</p>
          </div>
        )}
      </div>

      {/* 创建/编辑用户弹窗 */}
      {(showCreateModal || editingUser) && (
        <UserModal
          user={editingUser}
          departments={departments}
          onClose={() => {
            setShowCreateModal(false);
            setEditingUser(null);
          }}
          onSave={async (userData) => {
            if (editingUser) {
              await organizationApi.updateUser(editingUser.id, userData);
            } else {
              await organizationApi.createUser(userData);
            }
            setShowCreateModal(false);
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

// 用户编辑弹窗
function UserModal({
  user,
  departments,
  onClose,
  onSave,
}: {
  user: UserType | null;
  departments: string[];
  onClose: () => void;
  onSave: (data: Partial<UserType>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    role: user?.role || 'user',
    status: user?.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-[var(--color-bg-base)] rounded-lg shadow-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
            {user ? '编辑用户' : '添加用户'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded">
            <XCircle className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">邮箱</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">部门</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            >
              <option value="">选择部门</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">角色</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserType['role'] })}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            >
              <option value="user">普通用户</option>
              <option value="manager">经理</option>
              <option value="admin">管理员</option>
            </select>
          </div>

          {user && (
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserType['status'] })}
                className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
              >
                <option value="active">正常</option>
                <option value="inactive">禁用</option>
                <option value="pending">待激活</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
