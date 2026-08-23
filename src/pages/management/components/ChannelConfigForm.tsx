/**
 * Channel configuration form component
 */

import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  Switch,
  Divider,
  Space,
} from "antd";
import { channelTypeConfig } from "@/services";
import type { Channel, ChannelType } from "../../../types";

interface ChannelConfigFormProps {
  channel?: Channel;
  onSave: (data: Partial<Channel>) => void;
  onCancel: () => void;
}

export default function ChannelConfigForm({
  channel,
  onSave,
  onCancel,
}: ChannelConfigFormProps) {
  const [form] = Form.useForm();
  const [channelType, setChannelType] = useState<ChannelType>(
    channel?.type || "webhook",
  );
  const isEdit = !!channel;

  useEffect(() => {
    if (channel) {
      form.setFieldsValue({
        name: channel.name,
        description: channel.description,
        type: channel.type,
        ...channel.config,
      });
    }
  }, [channel, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { name, description, type, ...configValues } = values;

      const config = buildChannelConfig(channelType, configValues);

      onSave({
        name,
        description,
        type: channelType,
        config,
      });
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const handleTypeChange = (type: ChannelType) => {
    setChannelType(type);
    // Reset configuration fields
    const currentName = form.getFieldValue("name");
    const currentDesc = form.getFieldValue("description");
    form.resetFields();
    form.setFieldsValue({ name: currentName, description: currentDesc, type });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        type: channelType,
      }}
    >
      {/* Basic information */}
      <Form.Item
        name="name"
        label="渠道名称"
        rules={[{ required: true, message: "请输入渠道名称" }]}
      >
        <Input placeholder="请输入渠道名称" />
      </Form.Item>

      <Form.Item name="description" label="描述">
        <Input.TextArea rows={2} placeholder="请输入描述（可选）" />
      </Form.Item>

      <Form.Item
        name="type"
        label="渠道类型"
        rules={[{ required: true, message: "请选择渠道类型" }]}
      >
        <Select
          onChange={handleTypeChange}
          disabled={isEdit}
          options={Object.entries(channelTypeConfig).map(([key, value]) => ({
            value: key,
            label: (
              <div className="flex items-center gap-2">
                <span>{value.icon}</span>
                <span>{value.name}</span>
              </div>
            ),
          }))}
        />
      </Form.Item>

      <Divider>渠道配置</Divider>

      {/* Render different config forms by type */}
      {channelType === "wechat" && <WechatConfigForm />}
      {channelType === "wechat_work" && <WechatWorkConfigForm />}
      {channelType === "dingtalk" && <DingtalkConfigForm />}
      {channelType === "feishu" && <FeishuConfigForm />}
      {channelType === "slack" && <SlackConfigForm />}
      {channelType === "telegram" && <TelegramConfigForm />}
      {channelType === "discord" && <DiscordConfigForm />}
      {channelType === "whatsapp" && <WhatsAppConfigForm />}
      {channelType === "line" && <LineConfigForm />}
      {channelType === "messenger" && <MessengerConfigForm />}
      {channelType === "instagram" && <InstagramConfigForm />}
      {channelType === "teams" && <TeamsConfigForm />}
      {channelType === "webhook" && <WebhookConfigForm />}
      {channelType === "email" && <EmailConfigForm />}
      {channelType === "sms" && <SmsConfigForm />}
      {channelType === "custom" && <CustomConfigForm />}

      <Divider />

      <Form.Item className="mb-0">
        <Space className="w-full justify-end">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            {isEdit ? "保存" : "创建"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

// Build channel config (flat structure, maps directly to backend JSONB)
function buildChannelConfig(
  type: ChannelType,
  values: Record<string, unknown>,
): Record<string, unknown> {
  switch (type) {
    case "wechat":
      return {
        app_id: values.app_id as string,
        app_secret: values.app_secret as string,
        token: values.token as string,
        encoding_aes_key: values.encoding_aes_key as string,
      };
    case "wechat_work":
      return {
        corp_id: values.corp_id as string,
        agent_id: values.agent_id as string,
        secret: values.secret as string,
        token: values.token as string,
        encoding_aes_key: values.encoding_aes_key as string,
      };
    case "dingtalk":
      return {
        client_id: values.client_id as string,
        client_secret: values.client_secret as string,
        agent_id: values.agent_id as string,
      };
    case "feishu":
      return {
        app_id: values.app_id as string,
        app_secret: values.app_secret as string,
        encrypt_key: values.encrypt_key as string,
        verification_token: values.verification_token as string,
      };
    case "slack":
      return {
        bot_token: values.bot_token as string,
        app_token: values.app_token as string,
        signing_secret: values.signing_secret as string,
        client_id: values.client_id as string,
        client_secret: values.client_secret as string,
      };
    case "telegram":
      return {
        bot_token: values.bot_token as string,
        webhook_url: values.webhook_url as string,
      };
    case "discord":
      return {
        bot_token: values.bot_token as string,
        application_id: values.application_id as string,
        public_key: values.public_key as string,
      };
    case "whatsapp":
      return {
        phone_number_id: values.phone_number_id as string,
        business_account_id: values.business_account_id as string,
        access_token: values.access_token as string,
        webhook_verify_token: values.webhook_verify_token as string,
        app_id: values.app_id as string,
        app_secret: values.app_secret as string,
      };
    case "line":
      return {
        channel_id: values.channel_id as string,
        channel_secret: values.channel_secret as string,
        channel_access_token: values.channel_access_token as string,
      };
    case "messenger":
      return {
        page_id: values.page_id as string,
        page_access_token: values.page_access_token as string,
        app_id: values.app_id as string,
        app_secret: values.app_secret as string,
        verify_token: values.verify_token as string,
      };
    case "instagram":
      return {
        account_id: values.account_id as string,
        access_token: values.access_token as string,
        app_id: values.app_id as string,
        app_secret: values.app_secret as string,
      };
    case "teams":
      return {
        tenant_id: values.tenant_id as string,
        client_id: values.client_id as string,
        client_secret: values.client_secret as string,
        bot_id: values.bot_id as string,
        bot_password: values.bot_password as string,
      };
    case "webhook":
      return {
        url: values.url as string,
        method: values.method as "GET" | "POST" | "PUT",
        headers: values.headers as Record<string, string>,
        secret: values.secret as string,
      };
    case "email":
      return {
        smtp_host: values.smtp_host as string,
        smtp_port: values.smtp_port as number,
        smtp_user: values.smtp_user as string,
        smtp_password: values.smtp_password as string,
        from_address: values.from_address as string,
        from_name: values.from_name as string,
        use_tls: values.use_tls as boolean,
      };
    case "sms":
      return {
        provider: values.provider as "aliyun" | "tencent" | "twilio",
        access_key_id: values.access_key_id as string,
        access_key_secret: values.access_key_secret as string,
        sign_name: values.sign_name as string,
        template_code: values.template_code as string,
        region: values.region as string,
      };
    case "custom":
      return {
        endpoint: values.endpoint as string,
        method: values.method as "GET" | "POST" | "PUT" | "DELETE",
        headers: values.headers as Record<string, string>,
        authentication: values.authentication as { type: 'none' | 'bearer' | 'basic' | 'api_key'; token?: string; username?: string; password?: string; api_key?: string; api_key_header?: string },
        request_template: values.request_template as string,
        response_mapping: values.response_mapping as string,
      };
    default:
      return { url: "", method: "POST" };
  }
}

// WeChat configuration form
function WechatConfigForm() {
  return (
    <>
      <Form.Item name="app_id" label="App ID" rules={[{ required: true }]}>
        <Input placeholder="微信公众号 AppID" />
      </Form.Item>
      <Form.Item
        name="app_secret"
        label="App Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="微信公众号 AppSecret" />
      </Form.Item>
      <Form.Item name="token" label="Token" rules={[{ required: true }]}>
        <Input placeholder="消息加密 Token" />
      </Form.Item>
      <Form.Item name="encoding_aes_key" label="EncodingAESKey">
        <Input placeholder="消息加密密钥（可选）" />
      </Form.Item>
    </>
  );
}

// WeCom configuration form
function WechatWorkConfigForm() {
  return (
    <>
      <Form.Item name="corp_id" label="Corp ID" rules={[{ required: true }]}>
        <Input placeholder="企业 ID" />
      </Form.Item>
      <Form.Item name="agent_id" label="Agent ID" rules={[{ required: true }]}>
        <Input placeholder="应用 AgentId" />
      </Form.Item>
      <Form.Item name="secret" label="Secret" rules={[{ required: true }]}>
        <Input.Password placeholder="应用 Secret" />
      </Form.Item>
      <Form.Item name="token" label="Token" rules={[{ required: true }]}>
        <Input placeholder="消息加密 Token" />
      </Form.Item>
      <Form.Item name="encoding_aes_key" label="EncodingAESKey">
        <Input placeholder="消息加密密钥（可选）" />
      </Form.Item>
    </>
  );
}

// DingTalk configuration form
function DingtalkConfigForm() {
  return (
    <>
      <Form.Item name="client_id" label="Client ID" rules={[{ required: true }]}>
        <Input placeholder="钉钉应用 Client ID" />
      </Form.Item>
      <Form.Item
        name="client_secret"
        label="Client Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="钉钉应用 Client Secret" />
      </Form.Item>
      <Form.Item name="agent_id" label="Agent ID">
        <Input placeholder="应用 AgentId（可选）" />
      </Form.Item>
    </>
  );
}

// Feishu configuration form
function FeishuConfigForm() {
  return (
    <>
      <Form.Item name="app_id" label="App ID" rules={[{ required: true }]}>
        <Input placeholder="飞书应用 App ID" />
      </Form.Item>
      <Form.Item
        name="app_secret"
        label="App Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="飞书应用 App Secret" />
      </Form.Item>
      <Form.Item name="encrypt_key" label="Encrypt Key">
        <Input placeholder="加密 Key（可选）" />
      </Form.Item>
      <Form.Item name="verification_token" label="Verification Token">
        <Input placeholder="验证 Token（可选）" />
      </Form.Item>
    </>
  );
}

// Slack configuration form
function SlackConfigForm() {
  return (
    <>
      <Form.Item name="bot_token" label="Bot Token" rules={[{ required: true }]}>
        <Input.Password placeholder="xoxb-..." />
      </Form.Item>
      <Form.Item name="app_token" label="App Token">
        <Input.Password placeholder="xapp-...（可选）" />
      </Form.Item>
      <Form.Item
        name="signing_secret"
        label="Signing Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="签名密钥" />
      </Form.Item>
      <Form.Item name="client_id" label="Client ID">
        <Input placeholder="OAuth Client ID（可选）" />
      </Form.Item>
      <Form.Item name="client_secret" label="Client Secret">
        <Input.Password placeholder="OAuth Client Secret（可选）" />
      </Form.Item>
    </>
  );
}

// Telegram configuration form
function TelegramConfigForm() {
  return (
    <>
      <Form.Item name="bot_token" label="Bot Token" rules={[{ required: true }]}>
        <Input.Password placeholder="123456:ABC..." />
      </Form.Item>
      <Form.Item name="webhook_url" label="Webhook URL">
        <Input placeholder="Webhook 地址（可选）" />
      </Form.Item>
    </>
  );
}

// Discord configuration form
function DiscordConfigForm() {
  return (
    <>
      <Form.Item name="bot_token" label="Bot Token" rules={[{ required: true }]}>
        <Input.Password placeholder="Discord Bot Token" />
      </Form.Item>
      <Form.Item
        name="application_id"
        label="Application ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="Discord Application ID" />
      </Form.Item>
      <Form.Item name="public_key" label="Public Key">
        <Input placeholder="Public Key（可选）" />
      </Form.Item>
    </>
  );
}

// Webhook configuration form
function WebhookConfigForm() {
  return (
    <>
      <Form.Item name="url" label="URL" rules={[{ required: true }]}>
        <Input placeholder="https://api.example.com/webhook" />
      </Form.Item>
      <Form.Item
        name="method"
        label="Method"
        rules={[{ required: true }]}
        initialValue="POST"
      >
        <Select
          options={[
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
          ]}
        />
      </Form.Item>
      <Form.Item name="headers" label="Headers">
        <Input.TextArea
          rows={3}
          placeholder='{"Content-Type": "application/json"}'
        />
      </Form.Item>
      <Form.Item name="secret" label="Secret">
        <Input.Password placeholder="签名密钥（可选）" />
      </Form.Item>
    </>
  );
}

// Email configuration form
function EmailConfigForm() {
  return (
    <>
      <Form.Item name="smtp_host" label="SMTP Host" rules={[{ required: true }]}>
        <Input placeholder="smtp.example.com" />
      </Form.Item>
      <Form.Item
        name="smtp_port"
        label="SMTP Port"
        rules={[{ required: true }]}
        initialValue={587}
      >
        <InputNumber min={1} max={65535} className="w-full" />
      </Form.Item>
      <Form.Item name="smtp_user" label="SMTP User" rules={[{ required: true }]}>
        <Input placeholder="用户名" />
      </Form.Item>
      <Form.Item
        name="smtp_password"
        label="SMTP Password"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="密码" />
      </Form.Item>
      <Form.Item
        name="from_address"
        label="发件人地址"
        rules={[{ required: true }]}
      >
        <Input placeholder="noreply@example.com" />
      </Form.Item>
      <Form.Item name="from_name" label="发件人名称">
        <Input placeholder="mofa-studio" />
      </Form.Item>
      <Form.Item
        name="use_tls"
        label="使用 TLS"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>
    </>
  );
}

// SMS configuration form
function SmsConfigForm() {
  return (
    <>
      <Form.Item
        name="provider"
        label="服务商"
        rules={[{ required: true }]}
        initialValue="aliyun"
      >
        <Select
          options={[
            { value: "aliyun", label: "阿里云" },
            { value: "tencent", label: "腾讯云" },
            { value: "twilio", label: "Twilio" },
          ]}
        />
      </Form.Item>
      <Form.Item
        name="access_key_id"
        label="Access Key ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="Access Key ID" />
      </Form.Item>
      <Form.Item
        name="access_key_secret"
        label="Access Key Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Access Key Secret" />
      </Form.Item>
      <Form.Item name="sign_name" label="签名名称" rules={[{ required: true }]}>
        <Input placeholder="短信签名" />
      </Form.Item>
      <Form.Item name="template_code" label="模板 Code">
        <Input placeholder="短信模板 Code（可选）" />
      </Form.Item>
      <Form.Item name="region" label="Region">
        <Input placeholder="地域（可选）" />
      </Form.Item>
    </>
  );
}

// Custom configuration form
function CustomConfigForm() {
  return (
    <>
      <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true }]}>
        <Input placeholder="API 端点" />
      </Form.Item>
      <Form.Item
        name="method"
        label="Method"
        rules={[{ required: true }]}
        initialValue="POST"
      >
        <Select
          options={[
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
            { value: "DELETE", label: "DELETE" },
          ]}
        />
      </Form.Item>
      <Form.Item name="headers" label="Headers">
        <Input.TextArea
          rows={3}
          placeholder='{"Content-Type": "application/json"}'
        />
      </Form.Item>
      <Form.Item name="request_template" label="请求模板">
        <Input.TextArea
          rows={4}
          placeholder='{"message": "{{message}}", "user": "{{userId}}"}'
        />
      </Form.Item>
      <Form.Item name="response_mapping" label="响应映射">
        <Input.TextArea
          rows={3}
          placeholder='{"success": "$.success", "message": "$.data.message"}'
        />
      </Form.Item>
    </>
  );
}

// WhatsApp configuration form
function WhatsAppConfigForm() {
  return (
    <>
      <Form.Item
        name="phone_number_id"
        label="Phone Number ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="WhatsApp Business Phone Number ID" />
      </Form.Item>
      <Form.Item
        name="business_account_id"
        label="Business Account ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="WhatsApp Business Account ID" />
      </Form.Item>
      <Form.Item
        name="access_token"
        label="Access Token"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Permanent Access Token" />
      </Form.Item>
      <Form.Item name="webhook_verify_token" label="Webhook Verify Token">
        <Input placeholder="Webhook 验证 Token（可选）" />
      </Form.Item>
      <Form.Item name="app_id" label="App ID">
        <Input placeholder="Facebook App ID（可选）" />
      </Form.Item>
      <Form.Item name="app_secret" label="App Secret">
        <Input.Password placeholder="Facebook App Secret（可选）" />
      </Form.Item>
    </>
  );
}

// Line configuration form
function LineConfigForm() {
  return (
    <>
      <Form.Item
        name="channel_id"
        label="Channel ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="Line Channel ID" />
      </Form.Item>
      <Form.Item
        name="channel_secret"
        label="Channel Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Line Channel Secret" />
      </Form.Item>
      <Form.Item
        name="channel_access_token"
        label="Channel Access Token"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Long-lived Channel Access Token" />
      </Form.Item>
    </>
  );
}

// Facebook Messenger configuration form
function MessengerConfigForm() {
  return (
    <>
      <Form.Item name="page_id" label="Page ID" rules={[{ required: true }]}>
        <Input placeholder="Facebook Page ID" />
      </Form.Item>
      <Form.Item
        name="page_access_token"
        label="Page Access Token"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Page Access Token" />
      </Form.Item>
      <Form.Item name="app_id" label="App ID" rules={[{ required: true }]}>
        <Input placeholder="Facebook App ID" />
      </Form.Item>
      <Form.Item
        name="app_secret"
        label="App Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Facebook App Secret" />
      </Form.Item>
      <Form.Item name="verify_token" label="Verify Token">
        <Input placeholder="Webhook 验证 Token（可选）" />
      </Form.Item>
    </>
  );
}

// Instagram configuration form
function InstagramConfigForm() {
  return (
    <>
      <Form.Item
        name="account_id"
        label="Instagram Account ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="Instagram Business Account ID" />
      </Form.Item>
      <Form.Item
        name="access_token"
        label="Access Token"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Page Access Token with Instagram permissions" />
      </Form.Item>
      <Form.Item name="app_id" label="App ID" rules={[{ required: true }]}>
        <Input placeholder="Facebook App ID" />
      </Form.Item>
      <Form.Item
        name="app_secret"
        label="App Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Facebook App Secret" />
      </Form.Item>
    </>
  );
}

// Microsoft Teams configuration form
function TeamsConfigForm() {
  return (
    <>
      <Form.Item name="tenant_id" label="Tenant ID" rules={[{ required: true }]}>
        <Input placeholder="Azure AD Tenant ID" />
      </Form.Item>
      <Form.Item name="client_id" label="Client ID" rules={[{ required: true }]}>
        <Input placeholder="Azure AD Application Client ID" />
      </Form.Item>
      <Form.Item
        name="client_secret"
        label="Client Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Azure AD Application Client Secret" />
      </Form.Item>
      <Form.Item name="bot_id" label="Bot ID">
        <Input placeholder="Microsoft App ID (Bot ID)（可选）" />
      </Form.Item>
      <Form.Item name="bot_password" label="Bot Password">
        <Input.Password placeholder="Bot Password/Secret（可选）" />
      </Form.Item>
    </>
  );
}
