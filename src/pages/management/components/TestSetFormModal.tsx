/**
 * 测试集创建/编辑表单弹窗
 */

import { useEffect, useMemo } from "react";
import { Form, Input, TreeSelect } from "antd";
import { FormModal } from "@/components/common/Modal";
import type { TestSet, TestSetFormData, TestCategory } from "@/types/testset";
import { convertFlatToTree } from "@/utils/tree";

interface TestSetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TestSetFormData) => Promise<void>;
  testSet?: TestSet | null;
  categories: TestCategory[];
  defaultCategoryId?: string;
  loading?: boolean;
}

export function TestSetFormModal({
  open,
  onClose,
  onSubmit,
  testSet,
  categories,
  defaultCategoryId,
  loading,
}: TestSetFormModalProps) {
  const [form] = Form.useForm<TestSetFormData>();
  const isEdit = !!testSet;

  // 构建分类树选择数据
  const categoryTreeData = useMemo(() => {
    const flatNodes = categories.map((cat) => ({
      id: cat.id,
      parentId: cat.parentId || "",
      title: cat.name,
      value: cat.id,
    }));
    const tree = convertFlatToTree(flatNodes);
    return tree.map((node) => ({
      title: node.title,
      value: node.value,
      children: node.children?.map((child) => ({
        title: child.title,
        value: child.value,
      })),
    }));
  }, [categories]);

  useEffect(() => {
    if (open) {
      if (testSet) {
        form.setFieldsValue({
          name: testSet.name,
          description: testSet.description || "",
          categoryId: testSet.categoryId || undefined,
        });
      } else {
        form.resetFields();
        if (defaultCategoryId) {
          form.setFieldsValue({ categoryId: defaultCategoryId });
        }
      }
    }
  }, [open, testSet, form, defaultCategoryId]);

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

        <Form.Item name="categoryId" label="所属分类">
          <TreeSelect
            treeData={categoryTreeData}
            placeholder="选择分类文件夹"
            allowClear
            treeDefaultExpandAll
          />
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
