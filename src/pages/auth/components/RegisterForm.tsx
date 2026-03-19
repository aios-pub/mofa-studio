/**
 * 注册表单组件
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RobotOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { Button, Checkbox, Divider } from "antd";
import { useUserActions } from "../../../stores/useUserStore";
import { authApi } from "@/services";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUserToken, setUserInfo } = useUserActions();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch", "两次输入的密码不一致"));
      return;
    }

    if (!agreed) {
      setError(t("auth.agreeTerms", "请阅读并同意用户协议"));
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.signup({ username, email, password });
      setUserToken({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
      setUserInfo(res.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
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
          AmosClaw
        </span>
      </div>

      {/* 标题 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
          {t("auth.createAccount", "创建账户")}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t("auth.registerHint", "填写以下信息注册新账户")}
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
          <span className="i-ant-design:exclamation-circle-filled" />
          {error}
        </div>
      )}

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 用户名 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            {t("auth.username", "用户名")}
          </label>
          <div className="relative">
            <UserOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
              placeholder={t("auth.usernamePlaceholder", "请输入用户名")}
              required
            />
          </div>
        </div>

        {/* 邮箱 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            {t("auth.email", "邮箱")}
          </label>
          <div className="relative">
            <MailOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
              placeholder={t("auth.emailPlaceholder", "请输入邮箱")}
              required
            />
          </div>
        </div>

        {/* 密码 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            {t("auth.password", "密码")}
          </label>
          <div className="relative">
            <LockOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
              placeholder={t("auth.passwordPlaceholder", "请输入密码")}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </button>
          </div>
        </div>

        {/* 确认密码 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            {t("auth.confirmPassword", "确认密码")}
          </label>
          <div className="relative">
            <LockOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
              placeholder={t(
                "auth.confirmPasswordPlaceholder",
                "请再次输入密码",
              )}
              required
            />
          </div>
        </div>

        {/* 同意协议 */}
        <div className="flex items-start gap-2">
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

        {/* 注册按钮 */}
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
      </form>

      {/* 分隔线 */}
      <Divider className="!my-6 !text-[var(--color-text-tertiary)]">
        <span className="text-xs">{t("auth.or", "或")}</span>
      </Divider>

      {/* 登录入口 */}
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
