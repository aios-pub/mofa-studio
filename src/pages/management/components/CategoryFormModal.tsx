/**
 * 测试分类创建/编辑弹窗
 */

import { useEffect } from "react";
import { Form, Input, Select } from "antd";
import { FormModal, useFormError } from "@/components/common/Modal";
import type { TestCategory, TestCategoryFormData } from "@/types/testset";

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TestCategoryFormData) => Promise<void>;
  category?: TestCategory | null;
  parentId?: string;
  categories?: TestCategory[];
  loading?: boolean;
}

export function CategoryFormModal({
  open,
  onClose,
  onSubmit,
  category,
  parentId,
  categories = [],
  loading,
}: CategoryFormModalProps) {
  const [form] = Form.useForm<TestCategoryFormData>();
  const isEdit = !!category;
  const { error, handleError, clearError } = useFormError(open);

  useEffect(() => {
    if (open) {
      if (category) {
        form.setFieldsValue({ name: category.name, parentId: category.parentId });
      } else {
        form.setFieldsValue({ name: undefined, parentId: parentId });
      }
    }
  }, [open, category, parentId, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      handleError(err);
    }
  };

  // 排除当前分类本身作为父选项（防止选择自己作为父分类）
  const parentOptions = categories
    .filter((c) => !category || c.id !== category.id)
    .map((c) => ({ label: c.name, value: c.id }));

  return (
    <FormModal
      open={open}
      onCancel={onClose}
      onSubmit={handleOk}
      title={isEdit ? "编辑分类" : "新建分类"}
      submitText={isEdit ? "保存" : "创建"}
      loading={loading}
      error={error}
      onClearError={clearError}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="name"
          label="分类名称"
          rules={[{ required: true, message: "请输入分类名称" }]}
        >
          <Input placeholder="请输入分类名称" />
        </Form.Item>

        <Form.Item name="parentId" label="父分类">
          <Select
            placeholder="选择父分类（可选）"
            allowClear
            options={parentOptions}
          />
        </Form.Item>
      </Form>
    </FormModal>
  );
}
