/**
 * 登录表单组件
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserActions } from '../../../stores/useUserStore';
import authApi from '../../../services/mock/auth';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUserToken, setUserInfo } = useUserActions();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.signin({ username, password });
      setUserToken({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      setUserInfo(res.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
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
        {t('auth.welcomeBack', '欢迎回来')}
      </h1>
      <p className="text-center text-[var(--color-text-secondary)] mb-8">
        {t('auth.loginHint', '请输入您的账户信息登录')}
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

        {/* 记住我 & 忘记密码 */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">
              {t('auth.rememberMe', '记住我')}
            </span>
          </label>
          <a
            href="#"
            className="text-sm text-[var(--color-primary)] hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            {t('auth.forgotPassword', '忘记密码？')}
          </a>
        </div>

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? t('auth.loggingIn', '登录中...') : t('auth.login', '登录')}
        </button>
      </form>

      {/* 注册入口 */}
      <div className="mt-6 text-center">
        <span className="text-[var(--color-text-secondary)]">
          {t('auth.noAccount', '还没有账户？')}
        </span>
        <button
          onClick={onSwitchToRegister}
          className="ml-1 text-[var(--color-primary)] hover:underline font-medium"
        >
          {t('auth.register', '立即注册')}
        </button>
      </div>

      {/* 测试账户提示 */}
      <div className="mt-8 p-4 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
          {t('auth.testAccounts', '测试账户：')}
        </p>
        <div className="space-y-1 text-xs text-[var(--color-text-tertiary)]">
          <p>admin / 123456 - {t('auth.adminAccount', '管理员账户')}</p>
          <p>user / 123456 - {t('auth.userAccount', '普通用户账户')}</p>
        </div>
      </div>
    </div>
  );
}
