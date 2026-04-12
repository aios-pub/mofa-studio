/**
 * 渠道配置表单组件
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
import type { Channel, ChannelType, ChannelConfig } from "../../../types";

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
        ...channel.config.config,
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
    // 重置配置字段
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
      {/* 基本信息 */}
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

      {/* 根据类型渲染不同的配置表单 */}
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

// 构建渠道配置
function buildChannelConfig(
  type: ChannelType,
  values: Record<string, unknown>,
): ChannelConfig {
  switch (type) {
    case "wechat":
      return {
        type: "wechat",
        config: {
          appId: values.appId as string,
          appSecret: values.appSecret as string,
          token: values.token as string,
          encodingAESKey: values.encodingAESKey as string,
        },
      };
    case "wechat_work":
      return {
        type: "wechat_work",
        config: {
          corpId: values.corpId as string,
          agentId: values.agentId as string,
          secret: values.secret as string,
          token: values.token as string,
          encodingAESKey: values.encodingAESKey as string,
        },
      };
    case "dingtalk":
      return {
        type: "dingtalk",
        config: {
          appKey: values.appKey as string,
          appSecret: values.appSecret as string,
          agentId: values.agentId as string,
        },
      };
    case "feishu":
      return {
        type: "feishu",
        config: {
          appId: values.appId as string,
          appSecret: values.appSecret as string,
          encryptKey: values.encryptKey as string,
          verificationToken: values.verificationToken as string,
        },
      };
    case "slack":
      return {
        type: "slack",
        config: {
          botToken: values.botToken as string,
          appToken: values.appToken as string,
          signingSecret: values.signingSecret as string,
          clientId: values.clientId as string,
          clientSecret: values.clientSecret as string,
        },
      };
    case "telegram":
      return {
        type: "telegram",
        config: {
          botToken: values.botToken as string,
          webhookUrl: values.webhookUrl as string,
        },
      };
    case "discord":
      return {
        type: "discord",
        config: {
          botToken: values.botToken as string,
          applicationId: values.applicationId as string,
          publicKey: values.publicKey as string,
        },
      };
    case "whatsapp":
      return {
        type: "whatsapp",
        config: {
          phoneNumberId: values.phoneNumberId as string,
          businessAccountId: values.businessAccountId as string,
          accessToken: values.accessToken as string,
          webhookVerifyToken: values.webhookVerifyToken as string,
          appId: values.appId as string,
          appSecret: values.appSecret as string,
        },
      };
    case "line":
      return {
        type: "line",
        config: {
          channelId: values.channelId as string,
          channelSecret: values.channelSecret as string,
          channelAccessToken: values.channelAccessToken as string,
        },
      };
    case "messenger":
      return {
        type: "messenger",
        config: {
          pageId: values.pageId as string,
          pageAccessToken: values.pageAccessToken as string,
          appId: values.appId as string,
          appSecret: values.appSecret as string,
          verifyToken: values.verifyToken as string,
        },
      };
    case "instagram":
      return {
        type: "instagram",
        config: {
          accountId: values.accountId as string,
          accessToken: values.accessToken as string,
          appId: values.appId as string,
          appSecret: values.appSecret as string,
        },
      };
    case "teams":
      return {
        type: "teams",
        config: {
          tenantId: values.tenantId as string,
          clientId: values.clientId as string,
          clientSecret: values.clientSecret as string,
          botId: values.botId as string,
          botPassword: values.botPassword as string,
        },
      };
    case "webhook":
      return {
        type: "webhook",
        config: {
          url: values.url as string,
          method: values.method as "GET" | "POST" | "PUT",
          headers: values.headers as Record<string, string>,
          secret: values.secret as string,
        },
      };
    case "email":
      return {
        type: "email",
        config: {
          smtpHost: values.smtpHost as string,
          smtpPort: values.smtpPort as number,
          smtpUser: values.smtpUser as string,
          smtpPassword: values.smtpPassword as string,
          fromAddress: values.fromAddress as string,
          fromName: values.fromName as string,
          useTLS: values.useTLS as boolean,
        },
      };
    case "sms":
      return {
        type: "sms",
        config: {
          provider: values.provider as "aliyun" | "tencent" | "twilio",
          accessKeyId: values.accessKeyId as string,
          accessKeySecret: values.accessKeySecret as string,
          signName: values.signName as string,
          templateCode: values.templateCode as string,
          region: values.region as string,
        },
      };
    case "custom":
      return {
        type: "custom",
        config: {
          endpoint: values.endpoint as string,
          method: values.method as "GET" | "POST" | "PUT" | "DELETE",
          headers: values.headers as Record<string, string>,
          authentication: values.authentication as any,
          requestTemplate: values.requestTemplate as string,
          responseMapping: values.responseMapping as string,
        },
      };
    default:
      return { type: "webhook", config: { url: "", method: "POST" } };
  }
}

// 微信配置表单
function WechatConfigForm() {
  return (
    <>
      <Form.Item name="appId" label="App ID" rules={[{ required: true }]}>
        <Input placeholder="微信公众号 AppID" />
      </Form.Item>
      <Form.Item
        name="appSecret"
        label="App Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="微信公众号 AppSecret" />
      </Form.Item>
      <Form.Item name="token" label="Token" rules={[{ required: true }]}>
        <Input placeholder="消息加密 Token" />
      </Form.Item>
      <Form.Item name="encodingAESKey" label="EncodingAESKey">
        <Input placeholder="消息加密密钥（可选）" />
      </Form.Item>
    </>
  );
}

// 企业微信配置表单
function WechatWorkConfigForm() {
  return (
    <>
      <Form.Item name="corpId" label="Corp ID" rules={[{ required: true }]}>
        <Input placeholder="企业 ID" />
      </Form.Item>
      <Form.Item name="agentId" label="Agent ID" rules={[{ required: true }]}>
        <Input placeholder="应用 AgentId" />
      </Form.Item>
      <Form.Item name="secret" label="Secret" rules={[{ required: true }]}>
        <Input.Password placeholder="应用 Secret" />
      </Form.Item>
      <Form.Item name="token" label="Token" rules={[{ required: true }]}>
        <Input placeholder="消息加密 Token" />
      </Form.Item>
      <Form.Item name="encodingAESKey" label="EncodingAESKey">
        <Input placeholder="消息加密密钥（可选）" />
      </Form.Item>
    </>
  );
}

// 钉钉配置表单
function DingtalkConfigForm() {
  return (
    <>
      <Form.Item name="appKey" label="App Key" rules={[{ required: true }]}>
        <Input placeholder="钉钉应用 AppKey" />
      </Form.Item>
      <Form.Item
        name="appSecret"
        label="App Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="钉钉应用 AppSecret" />
      </Form.Item>
      <Form.Item name="agentId" label="Agent ID">
        <Input placeholder="应用 AgentId（可选）" />
      </Form.Item>
    </>
  );
}

// 飞书配置表单
function FeishuConfigForm() {
  return (
    <>
      <Form.Item name="appId" label="App ID" rules={[{ required: true }]}>
        <Input placeholder="飞书应用 App ID" />
      </Form.Item>
      <Form.Item
        name="appSecret"
        label="App Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="飞书应用 App Secret" />
      </Form.Item>
      <Form.Item name="encryptKey" label="Encrypt Key">
        <Input placeholder="加密 Key（可选）" />
      </Form.Item>
      <Form.Item name="verificationToken" label="Verification Token">
        <Input placeholder="验证 Token（可选）" />
      </Form.Item>
    </>
  );
}

// Slack 配置表单
function SlackConfigForm() {
  return (
    <>
      <Form.Item name="botToken" label="Bot Token" rules={[{ required: true }]}>
        <Input.Password placeholder="xoxb-..." />
      </Form.Item>
      <Form.Item name="appToken" label="App Token">
        <Input.Password placeholder="xapp-...（可选）" />
      </Form.Item>
      <Form.Item
        name="signingSecret"
        label="Signing Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="签名密钥" />
      </Form.Item>
      <Form.Item name="clientId" label="Client ID">
        <Input placeholder="OAuth Client ID（可选）" />
      </Form.Item>
      <Form.Item name="clientSecret" label="Client Secret">
        <Input.Password placeholder="OAuth Client Secret（可选）" />
      </Form.Item>
    </>
  );
}

// Telegram 配置表单
function TelegramConfigForm() {
  return (
    <>
      <Form.Item name="botToken" label="Bot Token" rules={[{ required: true }]}>
        <Input.Password placeholder="123456:ABC..." />
      </Form.Item>
      <Form.Item name="webhookUrl" label="Webhook URL">
        <Input placeholder="Webhook 地址（可选）" />
      </Form.Item>
    </>
  );
}

// Discord 配置表单
function DiscordConfigForm() {
  return (
    <>
      <Form.Item name="botToken" label="Bot Token" rules={[{ required: true }]}>
        <Input.Password placeholder="Discord Bot Token" />
      </Form.Item>
      <Form.Item
        name="applicationId"
        label="Application ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="Discord Application ID" />
      </Form.Item>
      <Form.Item name="publicKey" label="Public Key">
        <Input placeholder="Public Key（可选）" />
      </Form.Item>
    </>
  );
}

// Webhook 配置表单
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

// 邮件配置表单
function EmailConfigForm() {
  return (
    <>
      <Form.Item name="smtpHost" label="SMTP Host" rules={[{ required: true }]}>
        <Input placeholder="smtp.example.com" />
      </Form.Item>
      <Form.Item
        name="smtpPort"
        label="SMTP Port"
        rules={[{ required: true }]}
        initialValue={587}
      >
        <InputNumber min={1} max={65535} className="w-full" />
      </Form.Item>
      <Form.Item name="smtpUser" label="SMTP User" rules={[{ required: true }]}>
        <Input placeholder="用户名" />
      </Form.Item>
      <Form.Item
        name="smtpPassword"
        label="SMTP Password"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="密码" />
      </Form.Item>
      <Form.Item
        name="fromAddress"
        label="发件人地址"
        rules={[{ required: true }]}
      >
        <Input placeholder="noreply@example.com" />
      </Form.Item>
      <Form.Item name="fromName" label="发件人名称">
        <Input placeholder="AMOS" />
      </Form.Item>
      <Form.Item
        name="useTLS"
        label="使用 TLS"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>
    </>
  );
}

// 短信配置表单
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
        name="accessKeyId"
        label="Access Key ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="Access Key ID" />
      </Form.Item>
      <Form.Item
        name="accessKeySecret"
        label="Access Key Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Access Key Secret" />
      </Form.Item>
      <Form.Item name="signName" label="签名名称" rules={[{ required: true }]}>
        <Input placeholder="短信签名" />
      </Form.Item>
      <Form.Item name="templateCode" label="模板 Code">
        <Input placeholder="短信模板 Code（可选）" />
      </Form.Item>
      <Form.Item name="region" label="Region">
        <Input placeholder="地域（可选）" />
      </Form.Item>
    </>
  );
}

// 自定义配置表单
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
      <Form.Item name="requestTemplate" label="请求模板">
        <Input.TextArea
          rows={4}
          placeholder='{"message": "{{message}}", "user": "{{userId}}"}'
        />
      </Form.Item>
      <Form.Item name="responseMapping" label="响应映射">
        <Input.TextArea
          rows={3}
          placeholder='{"success": "$.success", "message": "$.data.message"}'
        />
      </Form.Item>
    </>
  );
}

// WhatsApp 配置表单
function WhatsAppConfigForm() {
  return (
    <>
      <Form.Item
        name="phoneNumberId"
        label="Phone Number ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="WhatsApp Business Phone Number ID" />
      </Form.Item>
      <Form.Item
        name="businessAccountId"
        label="Business Account ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="WhatsApp Business Account ID" />
      </Form.Item>
      <Form.Item
        name="accessToken"
        label="Access Token"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Permanent Access Token" />
      </Form.Item>
      <Form.Item name="webhookVerifyToken" label="Webhook Verify Token">
        <Input placeholder="Webhook 验证 Token（可选）" />
      </Form.Item>
      <Form.Item name="appId" label="App ID">
        <Input placeholder="Facebook App ID（可选）" />
      </Form.Item>
      <Form.Item name="appSecret" label="App Secret">
        <Input.Password placeholder="Facebook App Secret（可选）" />
      </Form.Item>
    </>
  );
}

// Line 配置表单
function LineConfigForm() {
  return (
    <>
      <Form.Item
        name="channelId"
        label="Channel ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="Line Channel ID" />
      </Form.Item>
      <Form.Item
        name="channelSecret"
        label="Channel Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Line Channel Secret" />
      </Form.Item>
      <Form.Item
        name="channelAccessToken"
        label="Channel Access Token"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Long-lived Channel Access Token" />
      </Form.Item>
    </>
  );
}

// Facebook Messenger 配置表单
function MessengerConfigForm() {
  return (
    <>
      <Form.Item name="pageId" label="Page ID" rules={[{ required: true }]}>
        <Input placeholder="Facebook Page ID" />
      </Form.Item>
      <Form.Item
        name="pageAccessToken"
        label="Page Access Token"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Page Access Token" />
      </Form.Item>
      <Form.Item name="appId" label="App ID" rules={[{ required: true }]}>
        <Input placeholder="Facebook App ID" />
      </Form.Item>
      <Form.Item
        name="appSecret"
        label="App Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Facebook App Secret" />
      </Form.Item>
      <Form.Item name="verifyToken" label="Verify Token">
        <Input placeholder="Webhook 验证 Token（可选）" />
      </Form.Item>
    </>
  );
}

// Instagram 配置表单
function InstagramConfigForm() {
  return (
    <>
      <Form.Item
        name="accountId"
        label="Instagram Account ID"
        rules={[{ required: true }]}
      >
        <Input placeholder="Instagram Business Account ID" />
      </Form.Item>
      <Form.Item
        name="accessToken"
        label="Access Token"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Page Access Token with Instagram permissions" />
      </Form.Item>
      <Form.Item name="appId" label="App ID" rules={[{ required: true }]}>
        <Input placeholder="Facebook App ID" />
      </Form.Item>
      <Form.Item
        name="appSecret"
        label="App Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Facebook App Secret" />
      </Form.Item>
    </>
  );
}

// Microsoft Teams 配置表单
function TeamsConfigForm() {
  return (
    <>
      <Form.Item name="tenantId" label="Tenant ID" rules={[{ required: true }]}>
        <Input placeholder="Azure AD Tenant ID" />
      </Form.Item>
      <Form.Item name="clientId" label="Client ID" rules={[{ required: true }]}>
        <Input placeholder="Azure AD Application Client ID" />
      </Form.Item>
      <Form.Item
        name="clientSecret"
        label="Client Secret"
        rules={[{ required: true }]}
      >
        <Input.Password placeholder="Azure AD Application Client Secret" />
      </Form.Item>
      <Form.Item name="botId" label="Bot ID">
        <Input placeholder="Microsoft App ID (Bot ID)（可选）" />
      </Form.Item>
      <Form.Item name="botPassword" label="Bot Password">
        <Input.Password placeholder="Bot Password/Secret（可选）" />
      </Form.Item>
    </>
  );
}
