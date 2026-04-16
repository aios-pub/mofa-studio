/**
 * 测试用例创建/编辑表单弹窗
 */

import { useEffect } from "react";
import { Form, Input, Select, Button, Space } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { FormModal, useFormError } from "@/components/common/Modal";
import type { TestCase, TestCaseFormData, Assertion, AssertionType } from "@/types/testset";

interface TestCaseFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TestCaseFormData) => Promise<void>;
  testCase?: TestCase | null;
  loading?: boolean;
}

const ASSERTION_TYPES: { label: string; value: AssertionType }[] = [
  { label: "包含", value: "contains" },
  { label: "精确匹配", value: "exact" },
  { label: "正则匹配", value: "regex" },
  { label: "AI 评估", value: "ai_eval" },
];

export function TestCaseFormModal({
  open,
  onClose,
  onSubmit,
  testCase,
  loading,
}: TestCaseFormModalProps) {
  const [form] = Form.useForm<TestCaseFormData>();
  const isEdit = !!testCase;
  const { error, handleError, clearError } = useFormError(open);

  useEffect(() => {
    if (open) {
      if (testCase) {
        const assertions = Array.isArray(testCase.assertions)
          ? (testCase.assertions as Assertion[]).map((a) => ({
              type: a.type,
              value: a.value,
              description: a.description || "",
            }))
          : [];
        form.setFieldsValue({
          name: testCase.name,
          description: testCase.description || "",
          input: testCase.input,
          expectedOutput: testCase.expectedOutput || "",
          assertions,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, testCase, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // 转换断言数据，添加 id
      const assertions: Assertion[] = (values.assertions || []).map((a, i) => ({
        id: `a-${Date.now()}-${i}`,
        type: a.type,
        value: a.value,
        description: a.description,
      }));
      await onSubmit({ ...values, assertions });
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      handleError(err);
    }
  };

  return (
    <FormModal
      open={open}
      onCancel={onClose}
      onSubmit={handleOk}
      title={isEdit ? "编辑测试用例" : "新建测试用例"}
      submitText={isEdit ? "保存" : "创建"}
      loading={loading}
      error={error}
      onClearError={clearError}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="name"
          label="用例名称"
          rules={[{ required: true, message: "请输入用例名称" }]}
        >
          <Input placeholder="请输入用例名称" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input placeholder="请输入用例描述" />
        </Form.Item>

        <Form.Item
          name="input"
          label="输入"
          rules={[{ required: true, message: "请输入测试输入" }]}
        >
          <Input.TextArea
            placeholder="请输入测试输入内容"
            rows={3}
            showCount
            maxLength={2000}
          />
        </Form.Item>

        <Form.Item name="expectedOutput" label="期望输出">
          <Input.TextArea
            placeholder="请输入期望输出"
            rows={2}
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item label="断言规则">
          <Form.List name="assertions">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: "flex", width: "100%" }}
                    align="start"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "type"]}
                      rules={[{ required: true, message: "请选择类型" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        style={{ width: 120 }}
                        placeholder="断言类型"
                        options={ASSERTION_TYPES}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "value"]}
                      rules={[{ required: true, message: "请输入值" }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input placeholder="匹配值" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "description"]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input placeholder="描述（可选）" />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ type: "contains" })}
                  icon={<PlusOutlined />}
                  style={{ width: "100%" }}
                >
                  添加断言
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </FormModal>
  );
}
