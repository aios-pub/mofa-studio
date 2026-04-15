/**
 * 测试分类创建/编辑弹窗
 */

import { useEffect } from "react";
import { Form, Input } from "antd";
import { FormModal } from "@/components/common/Modal";
import type { TestCategory, TestCategoryFormData } from "@/types/testset";

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TestCategoryFormData) => Promise<void>;
  category?: TestCategory | null;
  parentId?: string;
  loading?: boolean;
}

export function CategoryFormModal({
  open,
  onClose,
  onSubmit,
  category,
  parentId,
  loading,
}: CategoryFormModalProps) {
  const [form] = Form.useForm<TestCategoryFormData>();
  const isEdit = !!category;

  useEffect(() => {
    if (open) {
      if (category) {
        form.setFieldsValue({ name: category.name });
      } else {
        form.resetFields();
      }
    }
  }, [open, category, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit({ ...values, parentId: parentId });
    form.resetFields();
  };

  return (
    <FormModal
      open={open}
      onCancel={onClose}
      onSubmit={handleOk}
      title={isEdit ? "编辑分类" : "新建分类"}
      submitText={isEdit ? "保存" : "创建"}
      loading={loading}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="name"
          label="分类名称"
          rules={[{ required: true, message: "请输入分类名称" }]}
        >
          <Input placeholder="请输入分类名称" />
        </Form.Item>
      </Form>
    </FormModal>
  );
}
