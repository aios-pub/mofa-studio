import { useTranslation } from "react-i18next";
/**
 * Report form component
 */

import { useState } from 'react';
import { Modal, Form, Select, Input, message, Space } from 'antd';
import { FlagOutlined } from '@ant-design/icons';
import { useSkillHubStore } from '@/stores/useSkillHubStore';

const { TextArea } = Input;

interface ReportFormProps {
  visible: boolean;
  skillId: string;
  skillName: string;
  namespace: string;
  slug: string;
  onCancel: () => void;
}

const reportReasons = [
  '内容不当',
  '恶意代码',
  '侵权',
  '虚假描述',
  '功能异常',
  '其他',
];

export function ReportForm({
  visible,
  skillId,
  skillName,
  namespace,
  slug,
  onCancel,
}: ReportFormProps) {  const { t } = useTranslation();

  const [form] = Form.useForm();
  const { submitReport } = useSkillHubStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: { reason: string; details: string }) => {
    setSubmitting(true);
    try {
      await submitReport(namespace, slug, values.reason, values.details);
      message.success('举报已提交，感谢您的反馈');
      form.resetFields();
      onCancel();
    } catch (err) {
      message.error('提交失败: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FlagOutlined />
          <span>{t("举报技能")}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
    >
      <div className="mb-4">
        <span className="text-gray-600">{t("举报对象:")}</span>
        <span className="font-semibold">{skillName}</span>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ reason: '内容不当' }}
      >
        <Form.Item
          name="reason"
          label={t("举报原因")}
          rules={[{ required: true, message: '请选择举报原因' }]}
        >
          <Select options={reportReasons.map(r => ({ label: r, value: r }))} />
        </Form.Item>

        <Form.Item
          name="details"
          label={t("详细说明")}
          rules={[{ required: true, message: '请提供详细说明' }]}
        >
          <TextArea
            rows={4}
            placeholder={t("请详细描述您发现的问题...")}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Space style={{ float: 'right' }}>
            <Button onClick={onCancel}>{t("取消")}</Button>
            <Button type="primary" danger htmlType="submit" loading={submitting}>
              提交举报
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
