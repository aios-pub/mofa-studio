import { useTranslation } from "react-i18next";
/**
 * Local skills list component
 */

import { useState, useEffect } from "react";
import {
  Input,
  Button,
  Tag,
  Select,
  message,
  Collapse,
  Typography,
  Modal,
  Form,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  PoweroffOutlined,
  FolderOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { Skill } from "@/services";
import { skillApi } from "@/services";
import { SkillSourceTag } from "./SkillSourceTag";

const { Text, Title } = Typography;

interface LocalSkillsListProps {
  selectedSkill: Skill | null;
  onSelectSkill: (skill: Skill | null) => void;
  onRefresh?: () => void;
}

export function LocalSkillsList({
  selectedSkill,
  onSelectSkill,
  onRefresh,
}: LocalSkillsListProps) {  const { t } = useTranslation();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await skillApi.getAll();
      setSkills(data);
      onRefresh?.();
    } catch (error) {
      console.error("Failed to load skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (skill: Skill) => {
    try {
      const updated = await skillApi.update(skill.id, {
        enabled: !skill.enabled,
      });
      if (updated) {
        setSkills((prev) => prev.map((s) => (s.id === skill.id ? updated : s)));
        if (selectedSkill?.id === skill.id) {
          onSelectSkill(updated);
        }
        message.success(skill.enabled ? "已禁用" : "已启用");
      }
    } catch (error) {
      console.error("Failed to toggle skill:", error);
      message.error(t("操作失败"));
    }
  };

  const handleCreateSkill = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);
      const created = await skillApi.create({
        name: values.name,
        description: values.description || "",
        category: values.category || "general",
        parameters: [],
        enabled: true,
      });
      setSkills((prev) => [created, ...prev]);
      setShowCreateModal(false);
      createForm.resetFields();
      message.success(t("创建成功"));
    } catch (error: any) {
      if (error?.errorFields) return; // form validation error
      message.error(error?.message || "创建失败");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSkill = async () => {
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      const updated = await skillApi.update(editSkill!.id, {
        name: values.name,
        description: values.description || "",
        category: values.category || "general",
      });
      setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (selectedSkill?.id === updated.id) onSelectSkill(updated);
      setEditSkill(null);
      editForm.resetFields();
      message.success(t("更新成功"));
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.message || "更新失败");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteSkill = (skill: Skill) => {
    Modal.confirm({
      title: t("确认删除"),
      content: t("确定要删除 Skill「{{p0}}」吗？", { p0: skill.name }),
      okText: t("删除"),
      cancelText: t("取消"),
      okButtonProps: { danger: true },
      onOk: async () => {
        await skillApi.delete(skill.id);
        setSkills(skills.filter((s) => s.id !== skill.id));
        if (selectedSkill?.id === skill.id) onSelectSkill(null);
        message.success(t("已删除"));
      },
    });
  };

  // Get all categories
  const categories = ["all", ...new Set(skills.map((s) => s.category))];

  // Filter skills
  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || s.category === selectedCategory;
    const matchesType = selectedType === "all" || s.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  // Group by category
  const groupedSkills = filteredSkills.reduce(
    (acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    },
    {} as Record<string, Skill[]>,
  );

  const handleCategoryChange = (keys: string | string[]) => {
    setExpandedCategories(Array.isArray(keys) ? keys : [keys]);
  };

  const getTypeTag = (type: Skill["type"]) => {
    const config: Record<string, { color: string; label: string }> = {
      builtin: { color: "blue", label: t("内置") },
      custom: { color: "purple", label: t("自定义") },
      api: { color: "orange", label: "API" },
    };
    const item = config[type ?? ""] ?? {
      color: "default",
      label: type ?? "未知",
    };
    return <Tag color={item.color}>{item.label}</Tag>;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 space-y-3 border-b border-(--color-border)">
        <div className="flex items-center justify-between">
          <Title level={5} style={{ margin: 0 }}>
            本地 Skills
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => setShowCreateModal(true)}
          />
        </div>

        {/* Search */}
        <Input
          placeholder={t("搜索 Skills...")}
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />

        {/* Filters */}
        <div className="flex gap-2">
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ flex: 1 }}
            size="small"
            options={categories.map((cat) => ({
              label: cat === "all" ? "全部分类" : cat,
              value: cat,
            }))}
          />
          <Select
            value={selectedType}
            onChange={setSelectedType}
            style={{ flex: 1 }}
            size="small"
            options={[
              { label: t("全部类型"), value: "all" },
              { label: t("内置"), value: "builtin" },
              { label: t("自定义"), value: "custom" },
              { label: "API", value: "api" },
            ]}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <Text type="secondary">{t("加载中...")}</Text>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-8">
            <ThunderboltOutlined
              style={{
                fontSize: 24,
                opacity: 0.5,
                marginBottom: 8,
                display: "block",
              }}
            />
            <Text type="secondary">{t("暂无 Skills")}</Text>
          </div>
        ) : (
          <Collapse
            activeKey={expandedCategories}
            onChange={handleCategoryChange}
            expandIconPlacement="start"
            variant={false}
            style={{ background: "transparent" }}
            items={Object.entries(groupedSkills).map(
              ([category, categorySkills]) => ({
                key: category,
                label: (
                  <div className="flex items-center gap-2">
                    <FolderOutlined style={{ fontSize: 12 }} />
                    <Text strong style={{ fontSize: 13 }}>
                      {category}
                    </Text>
                    <Tag style={{ marginLeft: 4, fontSize: 11 }}>
                      {categorySkills.length}
                    </Tag>
                  </div>
                ),
                children: (
                  <div className="space-y-1">
                    {categorySkills.map((skill) => (
                      <div
                        key={skill.id}
                        onClick={() => onSelectSkill(skill)}
                        className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          selectedSkill?.id === skill.id
                            ? "bg-[var(--color-primary)]/10 border border-(--color-primary)/30"
                            : "hover:bg-(--color-bg-tertiary) border border-transparent"
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 p-1.5 rounded ${
                            skill.enabled
                              ? "bg-green-500/10 text-green-500"
                              : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          <ThunderboltOutlined style={{ fontSize: 12 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Text strong ellipsis style={{ fontSize: 13 }}>
                              {skill.name}
                            </Text>
                            {getTypeTag(skill.type)}
                            {skill.source && (
                              <SkillSourceTag source={skill.source} />
                            )}
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {Array.isArray(skill.parameters)
                              ? skill.parameters.length
                              : 0}{" "}
                            个参数 · {(skill.timeout ?? 0) / 1000}s 超时
                          </Text>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            className="opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              editForm.setFieldsValue({
                                name: skill.name,
                                description: skill.description,
                                category: skill.category,
                              });
                              setEditSkill(skill);
                            }}
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            className="opacity-0 group-hover:opacity-100 text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSkill(skill);
                            }}
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<PoweroffOutlined />}
                            className={`${skill.enabled ? "text-green-500" : "text-gray-400"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEnabled(skill);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              }),
            )}
          />
        )}
      </div>

      <Modal
        title={t("创建 Skill")}
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          createForm.resetFields();
        }}
        onOk={handleCreateSkill}
        confirmLoading={createLoading}
        okText={t("创建")}
        width={500}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" className="pt-2">
          <Form.Item
            name="name"
            label={t("名称")}
            rules={[{ required: true, message: t("请输入名称") }]}
          >
            <Input placeholder={t("输入 Skill 名称")} />
          </Form.Item>
          <Form.Item name="description" label={t("描述")}>
            <Input.TextArea placeholder={t("输入描述（可选）")} rows={3} />
          </Form.Item>
          <Form.Item name="category" label={t("分类")} initialValue="general">
            <Select
              options={[
                { label: t("通用"), value: "general" },
                { label: t("数据处理"), value: "data" },
                { label: t("网络"), value: "network" },
                { label: t("文件"), value: "file" },
                { label: t("系统集成"), value: "integration" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("编辑 Skill")}
        open={!!editSkill}
        onCancel={() => {
          setEditSkill(null);
          editForm.resetFields();
        }}
        onOk={handleEditSkill}
        confirmLoading={editLoading}
        okText={t("保存")}
        width={500}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" className="pt-2">
          <Form.Item
            name="name"
            label={t("名称")}
            rules={[{ required: true, message: t("请输入名称") }]}
          >
            <Input placeholder={t("输入 Skill 名称")} />
          </Form.Item>
          <Form.Item name="description" label={t("描述")}>
            <Input.TextArea placeholder={t("输入描述（可选）")} rows={3} />
          </Form.Item>
          <Form.Item name="category" label={t("分类")}>
            <Select
              options={[
                { label: t("通用"), value: "general" },
                { label: t("数据处理"), value: "data" },
                { label: t("网络"), value: "network" },
                { label: t("文件"), value: "file" },
                { label: t("系统集成"), value: "integration" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
