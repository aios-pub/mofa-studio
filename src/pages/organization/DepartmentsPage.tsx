/**
 * 部门管理页面
 */

import { useState, useEffect, useCallback } from "react";
import { Input, Button } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  UserOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { Department, User as UserType } from "@/services";
import { organizationApi } from "@/services";
import { formatDate } from "@/utils";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [departmentMembers, setDepartmentMembers] = useState<UserType[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await organizationApi.getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // 加载部门成员
  useEffect(() => {
    if (selectedDepartment) {
      organizationApi
        .getDepartmentMembers(selectedDepartment.id)
        .then(setDepartmentMembers);
    }
  }, [selectedDepartment]);

  // 过滤部门
  const filteredDepartments = departments.filter((dept) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      dept.name.toLowerCase().includes(query) ||
      dept.description?.toLowerCase().includes(query)
    );
  });

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("确定要删除这个部门吗？")) return;
    await organizationApi.deleteDepartment(id);
    if (selectedDepartment?.id === id) {
      setSelectedDepartment(null);
    }
    loadDepartments();
  };

  // 统计信息
  const totalMembers = departments.reduce((sum, d) => sum + d.memberCount, 0);

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-(--color-border) flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              部门管理
            </h2>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            />
          </div>

          {/* 搜索 */}
          <Input
            placeholder="搜索部门..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />

          {/* 统计 */}
          <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
            <span>{departments.length} 个部门</span>
            <span>•</span>
            <span>{totalMembers} 名成员</span>
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              加载中...
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <HomeOutlined className="text-3xl mx-auto mb-2 opacity-50" />
              <p>暂无部门</p>
            </div>
          ) : (
            filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                onClick={() => setSelectedDepartment(dept)}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedDepartment?.id === dept.id
                    ? "bg-[var(--color-primary)]/10 border border-(--color-primary)/30"
                    : "hover:bg-[var(--color-bg-tertiary)]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                    <HomeOutlined className="text-[var(--color-text-tertiary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {dept.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {dept.memberCount} 人
                      </span>
                    </div>
                    {dept.description && (
                      <p className="text-sm text-[var(--color-text-tertiary)] truncate mt-0.5">
                        {dept.description}
                      </p>
                    )}
                    {dept.manager && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        负责人: {dept.manager}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedDepartment ? (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  {selectedDepartment.name}
                </h2>
                <p className="text-[var(--color-text-secondary)]">
                  {selectedDepartment.description}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setEditingDepartment(selectedDepartment)}
                >
                  编辑
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteDepartment(selectedDepartment.id)}
                >
                  删除
                </Button>
              </div>
            </div>

            {/* 部门信息 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  成员数量
                </span>
                <p className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">
                  {selectedDepartment.memberCount}
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  负责人
                </span>
                <p className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">
                  {selectedDepartment.manager || "-"}
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  创建时间
                </span>
                <p className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">
                  {formatDate(selectedDepartment.createdAt)}
                </p>
              </div>
            </div>

            {/* 成员列表 */}
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
              <div className="p-3 border-b border-(--color-border) flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                  部门成员
                </h3>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {departmentMembers.length} 人
                </span>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {departmentMembers.length === 0 ? (
                  <div className="p-8 text-center text-[var(--color-text-tertiary)]">
                    <UserOutlined className="text-2xl mx-auto mb-2 opacity-50" />
                    <p>暂无成员</p>
                  </div>
                ) : (
                  departmentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-[var(--color-primary)]">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text-primary)]">
                          {member.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {member.email}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          member.role === "admin"
                            ? "bg-purple-500/10 text-purple-500"
                            : member.role === "manager"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {member.role === "admin"
                          ? "管理员"
                          : member.role === "manager"
                            ? "经理"
                            : "成员"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <HomeOutlined className="text-5xl text-[var(--color-text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                选择一个部门
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                从左侧列表中选择查看详情
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 创建/编辑部门弹窗 */}
      {(showCreateModal || editingDepartment) && (
        <DepartmentModal
          department={editingDepartment}
          onClose={() => {
            setShowCreateModal(false);
            setEditingDepartment(null);
          }}
          onSave={async (data) => {
            if (editingDepartment) {
              await organizationApi.updateDepartment(
                editingDepartment.id,
                data,
              );
            } else {
              await organizationApi.createDepartment(data);
            }
            setShowCreateModal(false);
            setEditingDepartment(null);
            loadDepartments();
          }}
        />
      )}
    </div>
  );
}

// 部门编辑弹窗
function DepartmentModal({
  department,
  onClose,
  onSave,
}: {
  department: Department | null;
  onClose: () => void;
  onSave: (data: Partial<Department>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: department?.name || "",
    description: department?.description || "",
    manager: department?.manager || "",
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
      <div className="w-full max-w-md bg-[var(--color-bg-base)] rounded-lg shadow-xl border border-(--color-border)">
        <div className="flex items-center justify-between p-4 border-b border-(--color-border)">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
            {department ? "编辑部门" : "添加部门"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded"
          >
            <CloseCircleOutlined className="text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              部门名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              部门描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              负责人
            </label>
            <input
              type="text"
              value={formData.manager}
              onChange={(e) =>
                setFormData({ ...formData, manager: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg hover:bg-[var(--color-bg-tertiary)]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
