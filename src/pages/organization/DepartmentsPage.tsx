import { useTranslation } from "react-i18next";
/**
 * Department management page
 */

import { useState, useEffect, useCallback } from "react";
import {
  App,
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Spin,
  Statistic,
  Tag,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import type { Department, User as UserType } from "@/services";
import { organizationApi } from "@/services";
import { formatDate } from "@/utils";
import ResizableSidebar from "@/components/layout/ResizableSidebar";
import { showDeleteConfirm } from "@/components/common";

export default function DepartmentsPage() {
  const { t } = useTranslation();
  const { modal } = App.useApp();

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

  // Load department members
  useEffect(() => {
    if (selectedDepartment) {
      organizationApi
        .getDepartmentMembers(selectedDepartment.id)
        .then(setDepartmentMembers);
    }
  }, [selectedDepartment]);

  // Filter departments
  const filteredDepartments = departments.filter((dept) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      dept.name.toLowerCase().includes(query) ||
      dept.description?.toLowerCase().includes(query)
    );
  });

  const handleDeleteDepartment = async (id: string) => {
    showDeleteConfirm(
      {
        title: t("确认删除"),
        content: t("确定要删除这个部门吗？"),
        okText: t("删除"),
        onOk: async () => {
          await organizationApi.deleteDepartment(id);
          if (selectedDepartment?.id === id) {
            setSelectedDepartment(null);
          }
          loadDepartments();
        },
      },
      modal,
    );
  };

  // Statistics info
  const totalMembers = departments.reduce((sum, d) => sum + d.memberCount, 0);

  const roleTag = (role: string) => {
    if (role === "admin") return <Tag color="purple">{t("管理员")}</Tag>;
    if (role === "manager") return <Tag color="blue">{t("经理")}</Tag>;
    return <Tag>{t("成员")}</Tag>;
  };

  return (
    <div className="flex h-full">
      {/* Left list */}
      <ResizableSidebar className="border-r border-(--color-border) bg-[var(--color-bg-secondary)]" storageKey="sidebar:departments">
        {/* Header */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t("部门管理")}
            </h2>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            />
          </div>

          {/* Search */}
          <Input
            placeholder={t("搜索部门...")}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />

          {/* Statistics */}
          <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
            <span>
              {departments.length} {t("个部门")}
            </span>
            <span>•</span>
            <span>
              {totalMembers} {t("名成员")}
            </span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : filteredDepartments.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("暂无部门")}
              className="py-8"
            />
          ) : (
            filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                onClick={() => setSelectedDepartment(dept)}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedDepartment?.id === dept.id
                    ? "bg-[var(--color-primary)]/10 border border-(--color-primary)/30"
                    : "hover:bg-(--color-bg-tertiary)"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-(--color-bg-tertiary) rounded-lg">
                    <HomeOutlined className="text-[var(--color-text-tertiary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {dept.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {dept.memberCount} {t("人")}
                      </span>
                    </div>
                    {dept.description && (
                      <p className="text-sm text-[var(--color-text-tertiary)] truncate mt-0.5">
                        {dept.description}
                      </p>
                    )}
                    {dept.manager && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        {t("负责人")}: {dept.manager}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ResizableSidebar>

      {/* Right details */}
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
                  {t("编辑")}
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteDepartment(selectedDepartment.id)}
                >
                  {t("删除")}
                </Button>
              </div>
            </div>

            {/* Department information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="rounded-lg">
                <Statistic
                  title={t("成员数量")}
                  value={selectedDepartment.memberCount}
                />
              </Card>
              <Card className="rounded-lg">
                <Statistic
                  title={t("负责人")}
                  value={selectedDepartment.manager || "-"}
                />
              </Card>
              <Card className="rounded-lg">
                <Statistic
                  title={t("创建时间")}
                  value={formatDate(selectedDepartment.createdAt)}
                />
              </Card>
            </div>

            {/* Member list */}
            <Card
              title={t("部门成员")}
              extra={
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {departmentMembers.length} {t("人")}
                </span>
              }
              className="rounded-lg"
            >
              {departmentMembers.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t("暂无成员")}
                  className="py-8"
                />
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {departmentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="py-3 flex items-center gap-3"
                    >
                      <Avatar
                        style={{
                          backgroundColor: "var(--color-primary)",
                          opacity: 0.9,
                        }}
                      >
                        {member.name.charAt(0)}
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text-primary)]">
                          {member.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {member.email}
                        </p>
                      </div>
                      {roleTag(member.role)}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Empty
              image={<HomeOutlined className="text-5xl text-[var(--color-text-tertiary)]" />}
              description={
                <div>
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                    {t("选择一个部门")}
                  </h3>
                  <p className="text-[var(--color-text-secondary)]">
                    {t("从左侧列表中选择查看详情")}
                  </p>
                </div>
              }
              className="mt-0"
            />
          </div>
        )}
      </div>

      {/* Create/edit department modal */}
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

// Department create/edit modal
function DepartmentModal({
  department,
  onClose,
  onSave,
}: {
  department: Department | null;
  onClose: () => void;
  onSave: (data: Partial<Department>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{
    name: string;
    description: string;
    manager: string;
  }>();
  const [saving, setSaving] = useState(false);

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await onSave(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={department ? t("编辑部门") : t("添加部门")}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText={t("保存")}
      cancelText={t("取消")}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: department?.name || "",
          description: department?.description || "",
          manager: department?.manager || "",
        }}
      >
        <Form.Item
          name="name"
          label={t("部门名称")}
          rules={[{ required: true, message: t("请输入部门名称") }]}
        >
          <Input placeholder={t("部门名称")} />
        </Form.Item>
        <Form.Item name="description" label={t("部门描述")}>
          <Input.TextArea rows={3} placeholder={t("部门描述")} />
        </Form.Item>
        <Form.Item name="manager" label={t("负责人")}>
          <Input placeholder={t("负责人")} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
