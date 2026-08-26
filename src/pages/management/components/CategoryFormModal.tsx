import { useTranslation } from "react-i18next";
/**
 * Test category create/edit modal
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
}: CategoryFormModalProps) {  const { t } = useTranslation();

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

  // Exclude the current category as a parent option (prevent selecting itself)
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
          label={t("分类名称")}
          rules={[{ required: true, message: t("请输入分类名称") }]}
        >
          <Input placeholder={t("请输入分类名称")} />
        </Form.Item>

        <Form.Item name="parentId" label={t("父分类")}>
          <Select
            placeholder={t("选择父分类（可选）")}
            allowClear
            options={parentOptions}
          />
        </Form.Item>
      </Form>
    </FormModal>
  );
}
