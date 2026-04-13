/**
 * 测试集创建/编辑表单弹窗
 */

import { useEffect } from "react";
import { Form, Input } from "antd";
import { FormModal } from "@/components/common/Modal";
import type { TestSet, TestSetFormData } from "@/types/testset";

interface TestSetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TestSetFormData) => Promise<void>;
  testSet?: TestSet | null;
  loading?: boolean;
}

export function TestSetFormModal({
  open,
  onClose,
  onSubmit,
  testSet,
  loading,
}: TestSetFormModalProps) {
  const [form] = Form.useForm<TestSetFormData>();
  const isEdit = !!testSet;

  useEffect(() => {
    if (open) {
      if (testSet) {
        form.setFieldsValue({
          name: testSet.name,
          description: testSet.description || "",
          category: testSet.category || "",
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, testSet, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
    form.resetFields();
  };

  return (
    <FormModal
      open={open}
      onCancel={onClose}
      onSubmit={handleOk}
      title={isEdit ? "编辑测试集" : "新建测试集"}
      submitText={isEdit ? "保存" : "创建"}
      loading={loading}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: "请输入测试集名称" }]}
        >
          <Input placeholder="请输入测试集名称" />
        </Form.Item>

        <Form.Item name="category" label="分类">
          <Input placeholder="请输入分类（如：基础测试、代码测试）" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea
            placeholder="请输入测试集描述"
            rows={3}
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </FormModal>
  );
}
