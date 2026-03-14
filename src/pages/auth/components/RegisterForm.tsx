/**
 * 注册表单组件
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, User, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserActions } from '../../../stores/useUserStore';
import authApi from '../../../services/mock/auth';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUserToken, setUserInfo } = useUserActions();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', '两次输入的密码不一致'));
      return;
    }

    if (!agreed) {
      setError(t('auth.agreeTerms', '请阅读并同意用户协议'));
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.signup({ username, email, password });
      setUserToken({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      setUserInfo(res.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <Bot className="w-10 h-10 text-[var(--color-primary)]" />
        <span className="text-2xl font-bold text-[var(--color-text-primary)]">AmosClaw</span>
      </div>

      {/* 标题 */}
      <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-2">
        {t('auth.createAccount', '创建账户')}
      </h1>
      <p className="text-center text-[var(--color-text-secondary)] mb-8">
        {t('auth.registerHint', '填写以下信息注册新账户')}
      </p>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 用户名 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
            {t('auth.username', '用户名')}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder={t('auth.usernamePlaceholder', '请输入用户名')}
              required
            />
          </div>
        </div>

        {/* 邮箱 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
            {t('auth.email', '邮箱')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder={t('auth.emailPlaceholder', '请输入邮箱')}
              required
            />
          </div>
        </div>

        {/* 密码 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
            {t('auth.password', '密码')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder={t('auth.passwordPlaceholder', '请输入密码')}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 确认密码 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
            {t('auth.confirmPassword', '确认密码')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder={t('auth.confirmPasswordPlaceholder', '请再次输入密码')}
              required
            />
          </div>
        </div>

        {/* 同意协议 */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">
            {t('auth.agreeText', '我已阅读并同意')}
            <a href="#" className="text-[var(--color-primary)] hover:underline" onClick={(e) => e.preventDefault()}>
              {t('auth.termsOfService', '用户协议')}
            </a>
            {t('auth.and', '和')}
            <a href="#" className="text-[var(--color-primary)] hover:underline" onClick={(e) => e.preventDefault()}>
              {t('auth.privacyPolicy', '隐私政策')}
            </a>
          </span>
        </div>

        {/* 注册按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? t('auth.registering', '注册中...') : t('auth.register', '注册')}
        </button>
      </form>

      {/* 登录入口 */}
      <div className="mt-6 text-center">
        <span className="text-[var(--color-text-secondary)]">
          {t('auth.hasAccount', '已有账户？')}
        </span>
        <button
          onClick={onSwitchToLogin}
          className="ml-1 text-[var(--color-primary)] hover:underline font-medium"
        >
          {t('auth.login', '立即登录')}
        </button>
      </div>
    </div>
  );
}
