/**
 * Octos 渠道配置 — 移植自 Octos MessagingPage
 * 支持 Telegram、Discord、Slack、WhatsApp、飞书、邮件等渠道
 */

import {
  Tabs,
  Switch,
  Input,
  Typography,
  Select,
  Alert,
} from "antd";
import type { OctosProfileConfig, OctosChannelCredentials, OctosChannelType } from "@/types/octos";
import { OCTOS_CHANNEL_LABELS, OCTOS_CHANNEL_ICONS } from "@/types/octos";

const { Text } = Typography;

interface Props {
  config: OctosProfileConfig;
  onChange: (config: OctosProfileConfig) => void;
}

interface ChannelConfigProps {
  config: OctosProfileConfig;
  onChange: (config: OctosProfileConfig) => void;
  channelType: string;
}

function getChannel(config: OctosProfileConfig, type: string): OctosChannelCredentials | undefined {
  return config.channels.find((c) => c.type === type);
}

function toggleChannel(config: OctosProfileConfig, type: string, on: boolean): OctosProfileConfig {
  if (on) {
    const defaults: Record<string, Record<string, string>> = {
      telegram: { token_env: "TELEGRAM_BOT_TOKEN", allowed_senders: "" },
      discord: { token_env: "DISCORD_BOT_TOKEN", application_id: "" },
      slack: { bot_token_env: "SLACK_BOT_TOKEN", app_token_env: "SLACK_APP_TOKEN" },
      whatsapp: {},
      feishu: { app_id_env: "FEISHU_APP_ID", app_secret_env: "FEISHU_APP_SECRET", mode: "websocket" },
      email: { provider: "smtp" },
      wecom_bot: { webhook_url_env: "WECOM_BOT_WEBHOOK_URL" },
      qq_bot: { app_id_env: "QQ_BOT_APP_ID", app_secret_env: "QQ_BOT_APP_SECRET" },
      wechat: {},
    };
    return {
      ...config,
      channels: [...config.channels, { type, ...defaults[type] }],
    };
  }
  return { ...config, channels: config.channels.filter((c) => c.type !== type) };
}

function updateChannelField(config: OctosProfileConfig, type: string, field: string, value: string | number): OctosProfileConfig {
  return {
    ...config,
    channels: config.channels.map((c) => (c.type === type ? { ...c, [field]: value } : c)),
  };
}

function updateEnvVar(config: OctosProfileConfig, key: string, value: string): OctosProfileConfig {
  const newEnvVars = { ...config.env_vars };
  if (value) {
    newEnvVars[key] = value;
  } else {
    delete newEnvVars[key];
  }
  return { ...config, env_vars: newEnvVars };
}

// Individual channel config components
function TelegramConfig({ config, onChange, channelType }: ChannelConfigProps) {
  const enabled = !!getChannel(config, channelType);
  const channel = getChannel(config, channelType);

  return (
    <div className="space-y-3">
      <Alert
        type="info"
        showIcon
        message="Telegram Bot"
        description={
          <ol className="list-decimal list-inside text-xs space-y-1 mt-1">
            <li>在 Telegram 上联系 @BotFather 并使用 /newbot 创建机器人</li>
            <li>复制 Bot Token 并粘贴到下方</li>
            <li>从 @userinfobot 获取你的 User ID 以限制访问（可选）</li>
          </ol>
        }
        className="text-xs"
      />
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onChange={(v) => onChange(toggleChannel(config, channelType, v))} />
        <Text>启用 Telegram 渠道</Text>
      </div>
      {enabled && (
        <>
          <div>
            <Text type="secondary" className="block mb-1">Bot Token</Text>
            <Input.Password
              value={config.env_vars["TELEGRAM_BOT_TOKEN"] || ""}
              onChange={(e) => onChange(updateEnvVar(config, "TELEGRAM_BOT_TOKEN", e.target.value))}
              placeholder="123456:ABC-DEF..."
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Text type="secondary" className="block mb-1">允许的发送者</Text>
            <Input
              value={(channel as any)?.allowed_senders || ""}
              onChange={(e) => onChange(updateChannelField(config, channelType, "allowed_senders", e.target.value))}
              placeholder="Telegram User IDs，逗号分隔（空 = 允许所有人）"
              className="font-mono text-xs"
            />
          </div>
        </>
      )}
    </div>
  );
}

function DiscordConfig({ config, onChange, channelType }: ChannelConfigProps) {
  const enabled = !!getChannel(config, channelType);

  return (
    <div className="space-y-3">
      <Alert type="info" showIcon message="Discord Bot" description="连接到 Discord 服务器作为机器人。需要在 Discord Developer Portal 创建应用。" className="text-xs" />
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onChange={(v) => onChange(toggleChannel(config, channelType, v))} />
        <Text>启用 Discord 渠道</Text>
      </div>
      {enabled && (
        <>
          <div>
            <Text type="secondary" className="block mb-1">Bot Token</Text>
            <Input.Password
              value={config.env_vars["DISCORD_BOT_TOKEN"] || ""}
              onChange={(e) => onChange(updateEnvVar(config, "DISCORD_BOT_TOKEN", e.target.value))}
              placeholder="Discord Bot Token"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Text type="secondary" className="block mb-1">Application ID</Text>
            <Input
              value={(getChannel(config, channelType) as any)?.application_id || ""}
              onChange={(e) => onChange(updateChannelField(config, channelType, "application_id", e.target.value))}
              placeholder="Discord Application ID"
              className="font-mono text-xs"
            />
          </div>
        </>
      )}
    </div>
  );
}

function FeishuConfig({ config, onChange, channelType }: ChannelConfigProps) {
  const enabled = !!getChannel(config, channelType);
  const channel = getChannel(config, channelType);

  return (
    <div className="space-y-3">
      <Alert
        type="info"
        showIcon
        message="飞书 / Lark"
        description={
          <ol className="list-decimal list-inside text-xs space-y-1 mt-1">
            <li>前往飞书开放平台创建自建应用</li>
            <li>启用机器人能力</li>
            <li>复制 App ID 和 App Secret</li>
            <li>订阅事件 im.message.receive_v1（选择长连接模式）</li>
          </ol>
        }
        className="text-xs"
      />
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onChange={(v) => onChange(toggleChannel(config, channelType, v))} />
        <Text>启用飞书渠道</Text>
      </div>
      {enabled && (
        <>
          <div>
            <Text type="secondary" className="block mb-1">App ID</Text>
            <Input.Password
              value={config.env_vars["FEISHU_APP_ID"] || ""}
              onChange={(e) => onChange(updateEnvVar(config, "FEISHU_APP_ID", e.target.value))}
              placeholder="cli_xxxx"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Text type="secondary" className="block mb-1">App Secret</Text>
            <Input.Password
              value={config.env_vars["FEISHU_APP_SECRET"] || ""}
              onChange={(e) => onChange(updateEnvVar(config, "FEISHU_APP_SECRET", e.target.value))}
              placeholder="secret..."
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Text type="secondary" className="block mb-1">连接模式</Text>
            <Select
              className="w-full"
              value={(channel as any)?.mode || "websocket"}
              onChange={(v) => onChange(updateChannelField(config, channelType, "mode", v))}
              options={[
                { label: "WebSocket（推荐，无需公网地址）", value: "websocket" },
                { label: "Webhook（需要公网地址 / ngrok）", value: "webhook" },
              ]}
            />
          </div>
          <div>
            <Text type="secondary" className="block mb-1">区域</Text>
            <Select
              className="w-full"
              value={(channel as any)?.region || "feishu"}
              onChange={(v) => onChange(updateChannelField(config, channelType, "region", v))}
              options={[
                { label: "飞书（中国）", value: "feishu" },
                { label: "Lark（国际）", value: "lark" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

function GenericChannelConfig({ config, onChange, channelType, envKeys, fields }: ChannelConfigProps & { envKeys: string[]; fields: { key: string; label: string; placeholder: string }[] }) {
  const enabled = !!getChannel(config, channelType);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onChange={(v) => onChange(toggleChannel(config, channelType, v))} />
        <Text>启用 {OCTOS_CHANNEL_LABELS[channelType as OctosChannelType] || channelType} 渠道</Text>
      </div>
      {enabled && (
        <>
          {envKeys.map((key) => (
            <div key={key}>
              <Text type="secondary" className="block mb-1">{key}</Text>
              <Input.Password
                value={config.env_vars[key] || ""}
                onChange={(e) => onChange(updateEnvVar(config, key, e.target.value))}
                placeholder={`输入 ${key} 的值`}
                className="font-mono text-xs"
              />
            </div>
          ))}
          {fields.map((f) => (
            <div key={f.key}>
              <Text type="secondary" className="block mb-1">{f.label}</Text>
              <Input
                value={(getChannel(config, channelType) as any)?.[f.key] || ""}
                onChange={(e) => onChange(updateChannelField(config, channelType, f.key, e.target.value))}
                placeholder={f.placeholder}
                className="font-mono text-xs"
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function OctosChannelsTab({ config, onChange }: Props) {
  const activeChannels = config.channels.map((c) => c.type);

  const channelTabs = [
    {
      key: "telegram",
      label: (
        <span>
          {OCTOS_CHANNEL_ICONS.telegram} {OCTOS_CHANNEL_LABELS.telegram}
          {activeChannels.includes("telegram") && " ●"}
        </span>
      ),
      children: <TelegramConfig config={config} onChange={onChange} channelType="telegram" />,
    },
    {
      key: "discord",
      label: (
        <span>
          {OCTOS_CHANNEL_ICONS.discord} {OCTOS_CHANNEL_LABELS.discord}
          {activeChannels.includes("discord") && " ●"}
        </span>
      ),
      children: <DiscordConfig config={config} onChange={onChange} channelType="discord" />,
    },
    {
      key: "feishu",
      label: (
        <span>
          {OCTOS_CHANNEL_ICONS.feishu} {OCTOS_CHANNEL_LABELS.feishu}
          {activeChannels.includes("feishu") && " ●"}
        </span>
      ),
      children: <FeishuConfig config={config} onChange={onChange} channelType="feishu" />,
    },
    {
      key: "slack",
      label: (
        <span>
          {OCTOS_CHANNEL_ICONS.slack} {OCTOS_CHANNEL_LABELS.slack}
          {activeChannels.includes("slack") && " ●"}
        </span>
      ),
      children: (
        <GenericChannelConfig
          config={config}
          onChange={onChange}
          channelType="slack"
          envKeys={["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN"]}
          fields={[]}
        />
      ),
    },
    {
      key: "whatsapp",
      label: (
        <span>
          {OCTOS_CHANNEL_ICONS.whatsapp} {OCTOS_CHANNEL_LABELS.whatsapp}
          {activeChannels.includes("whatsapp") && " ●"}
        </span>
      ),
      children: (
        <GenericChannelConfig
          config={config}
          onChange={onChange}
          channelType="whatsapp"
          envKeys={[]}
          fields={[]}
        />
      ),
    },
    {
      key: "email",
      label: (
        <span>
          {OCTOS_CHANNEL_ICONS.email} {OCTOS_CHANNEL_LABELS.email}
          {activeChannels.includes("email") && " ●"}
        </span>
      ),
      children: (
        <GenericChannelConfig
          config={config}
          onChange={onChange}
          channelType="email"
          envKeys={["SMTP_PASSWORD"]}
          fields={[
            { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
            { key: "from_address", label: "发件地址", placeholder: "bot@example.com" },
          ]}
        />
      ),
    },
  ];

  return <Tabs items={channelTabs} />;
}
