/**
 * Login form component
 * Use Ant Design components for visual consistency
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RobotOutlined,
  UserOutlined,
  LockOutlined,
  GithubOutlined,
  WechatOutlined,
  GoogleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Checkbox, Divider, Form, Input, Alert } from "antd";
import { useUserActions } from "../../../stores/useUserStore";
import { authApi } from "@/services";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

interface FormValues {
  username: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setUserToken, setUserInfo } = useUserActions();
  const [form] = Form.useForm<FormValues>();

  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (values: FormValues) => {
    setError("");
    setLoading(true);

    try {
      const res = await authApi.signin({
        username: values.username,
        password: values.password,
      });
      setUserToken({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
      setUserInfo(res.user);
      // Redirect to the original page or home
      const from = (location.state as any)?.from || "/";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  // Social login
  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
    // TODO: implement social login
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
          {t("auth.welcomeBack", "欢迎回来")}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t("auth.loginHint", "请输入您的账户信息登录")}
        </p>
      </div>

      {/* Error hint */}
      {error && <Alert title={error} type="error" showIcon className="mb-4" />}

      {/* Form */}
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={false}
        initialValues={{ rememberMe: true }}
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

        {/* Password */}
        <Form.Item
          name="password"
          label={t("auth.password", "密码")}
          rules={[
            {
              required: true,
              message: t("auth.passwordRequired", "请输入密码"),
            },
          ]}
        >
          <Input.Password
            prefix={
              <LockOutlined className="text-[var(--color-text-tertiary)]" />
            }
            placeholder={t("auth.passwordPlaceholder", "请输入密码")}
            size="large"
            iconRender={(visible) =>
              visible ? <LockOutlined /> : <LockOutlined />
            }
          />
        </Form.Item>

        {/* Remember me & forgot password */}
        <div className="flex items-center justify-between mb-4">
          <Checkbox
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          >
            <span className="text-sm text-[var(--color-text-secondary)]">
              {t("auth.rememberMe", "记住我")}
            </span>
          </Checkbox>
          <Button type="link" size="small" className="!p-0">
            {t("auth.forgotPassword", "忘记密码？")}
          </Button>
        </div>

        {/* Login button */}
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
              ? t("auth.loggingIn", "登录中...")
              : t("auth.login", "登录")}
          </Button>
        </Form.Item>
      </Form>

      {/* Divider */}
      <Divider className="!my-6 !text-[var(--color-text-tertiary)]">
        <span className="text-xs">
          {t("auth.orContinueWith", "或使用其他方式")}
        </span>
      </Divider>

      {/* Social login */}
      <div className="flex justify-center gap-4 mb-6">
        <Button
          shape="circle"
          size="large"
          icon={<GithubOutlined />}
          onClick={() => handleSocialLogin("github")}
          className="!flex items-center justify-center"
        />
        <Button
          shape="circle"
          size="large"
          icon={<WechatOutlined />}
          onClick={() => handleSocialLogin("wechat")}
          className="!flex items-center justify-center"
        />
        <Button
          shape="circle"
          size="large"
          icon={<GoogleOutlined />}
          onClick={() => handleSocialLogin("google")}
          className="!flex items-center justify-center"
        />
      </div>

      {/* Register entry */}
      <div className="text-center text-sm">
        <span className="text-[var(--color-text-secondary)]">
          {t("auth.noAccount", "还没有账户？")}
        </span>
        <Button type="link" onClick={onSwitchToRegister} className="!p-0 !ml-1">
          {t("auth.register", "立即注册")}
        </Button>
      </div>

      {/* Test account notice */}
      <div className="mt-6 p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-(--color-border)">
        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
          {t("auth.testAccounts", "测试账户：")}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
          <p>admin / 123456</p>
          <p>user / 123456</p>
        </div>
      </div>
    </div>
  );
}
