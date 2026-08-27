/**
 * Register form component
 * Use Ant Design components for visual consistency
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RobotOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Checkbox, Divider, Form, Input } from "antd";
import { useUserActions } from "../../../stores/useUserStore";
import { authApi } from "@/services";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

interface FormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUserToken, setUserInfo } = useUserActions();
  const [form] = Form.useForm<FormValues>();

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (values: FormValues) => {
    setError("");

    if (!agreed) {
      setError(t("auth.agreeTerms", "请阅读并同意用户协议"));
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.signup({
        username: values.username,
        email: values.email,
        password: values.password,
      });
      setUserToken({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
      setUserInfo(res.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("注册失败"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <RobotOutlined className="text-3xl text-[var(--color-primary)]" />
        <span className="text-2xl font-bold text-[var(--color-text-primary)]">
          mofa-studio
        </span>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
          {t("auth.createAccount", "创建账户")}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t("auth.registerHint", "填写以下信息注册新账户")}
        </p>
      </div>

      {/* Error hint */}
      {error && <Alert message={error} type="error" showIcon className="mb-4" />}

      {/* Form */}
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={false}
      >
        {/* Username */}
        <Form.Item
          name="username"
          label={t("auth.username", "用户名")}
          rules={[
            {
              required: true,
              message: t("auth.usernameRequired", "请输入用户名"),
            },
          ]}
        >
          <Input
            prefix={
              <UserOutlined className="text-[var(--color-text-tertiary)]" />
            }
            placeholder={t("auth.usernamePlaceholder", "请输入用户名")}
            size="large"
          />
        </Form.Item>

        {/* Email */}
        <Form.Item
          name="email"
          label={t("auth.email", "邮箱")}
          rules={[
            {
              required: true,
              message: t("auth.emailRequired", "请输入邮箱"),
            },
            {
              type: "email",
              message: t("auth.emailInvalid", "邮箱格式不正确"),
            },
          ]}
        >
          <Input
            prefix={
              <MailOutlined className="text-[var(--color-text-tertiary)]" />
            }
            placeholder={t("auth.emailPlaceholder", "请输入邮箱")}
            size="large"
          />
        </Form.Item>

        {/* Password */}
        <Form.Item
          name="password"
          label={t("auth.password", "密码")}
          rules={[
            {
              required: true,
              message: t("auth.passwordRequired", "请输入密码"),
            },
            {
              min: 6,
              message: t("auth.passwordMinLength", "密码至少 6 位"),
            },
          ]}
        >
          <Input.Password
            prefix={
              <LockOutlined className="text-[var(--color-text-tertiary)]" />
            }
            placeholder={t("auth.passwordPlaceholder", "请输入密码")}
            size="large"
          />
        </Form.Item>

        {/* Confirm password */}
        <Form.Item
          name="confirmPassword"
          label={t("auth.confirmPassword", "确认密码")}
          dependencies={["password"]}
          rules={[
            {
              required: true,
              message: t(
                "auth.confirmPasswordPlaceholder",
                "请再次输入密码",
              ),
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(
                    t("auth.passwordMismatch", "两次输入的密码不一致"),
                  ),
                );
              },
            }),
          ]}
        >
          <Input.Password
            prefix={
              <LockOutlined className="text-[var(--color-text-tertiary)]" />
            }
            placeholder={t("auth.confirmPasswordPlaceholder", "请再次输入密码")}
            size="large"
          />
        </Form.Item>

        {/* Agree to terms */}
        <div className="mb-4">
          <Checkbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          >
            <span className="text-sm text-[var(--color-text-secondary)]">
              {t("auth.agreeText", "我已阅读并同意")}
              <Button type="link" size="small" className="!p-0 !h-auto">
                {t("auth.termsOfService", "用户协议")}
              </Button>
              {t("auth.and", "和")}
              <Button type="link" size="small" className="!p-0 !h-auto">
                {t("auth.privacyPolicy", "隐私政策")}
              </Button>
            </span>
          </Checkbox>
        </div>

        {/* Register button */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            disabled={loading}
            icon={loading ? <SyncOutlined spin /> : null}
            className="h-11 font-medium"
          >
            {loading
              ? t("auth.registering", "注册中...")
              : t("auth.register", "注册")}
          </Button>
        </Form.Item>
      </Form>

      {/* Divider */}
      <Divider className="!my-6 !text-[var(--color-text-tertiary)]">
        <span className="text-xs">{t("auth.or", "或")}</span>
      </Divider>

      {/* Login entry */}
      <div className="text-center text-sm">
        <span className="text-[var(--color-text-secondary)]">
          {t("auth.hasAccount", "已有账户？")}
        </span>
        <Button type="link" onClick={onSwitchToLogin} className="!p-0 !ml-1">
          {t("auth.login", "立即登录")}
        </Button>
      </div>
    </div>
  );
}
