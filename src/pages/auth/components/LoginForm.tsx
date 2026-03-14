/**
 * 登录表单组件
 * 参考 slash-admin 的登录表单设计
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RobotOutlined,
  UserOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  GithubOutlined,
  WechatOutlined,
  GoogleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Divider } from 'antd';
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
  const [rememberMe, setRememberMe] = useState(true);
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

  // 社交登录
  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
    // TODO: 实现社交登录
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <RobotOutlined className="text-3xl text-[var(--color-primary)]" />
        <span className="text-2xl font-bold text-[var(--color-text-primary)]">AmosClaw</span>
      </div>

      {/* 标题 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
          {t('auth.welcomeBack', '欢迎回来')}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t('auth.loginHint', '请输入您的账户信息登录')}
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
            {t('auth.username', '用户名')}
          </label>
          <div className="relative">
            <UserOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
              placeholder={t('auth.usernamePlaceholder', '请输入用户名')}
              required
            />
          </div>
        </div>

        {/* 密码 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            {t('auth.password', '密码')}
          </label>
          <div className="relative">
            <LockOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
              placeholder={t('auth.passwordPlaceholder', '请输入密码')}
              required
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

        {/* 记住我 & 忘记密码 */}
        <div className="flex items-center justify-between">
          <Checkbox
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          >
            <span className="text-sm text-[var(--color-text-secondary)]">
              {t('auth.rememberMe', '记住我')}
            </span>
          </Checkbox>
          <Button type="link" size="small" className="!p-0">
            {t('auth.forgotPassword', '忘记密码？')}
          </Button>
        </div>

        {/* 登录按钮 */}
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          disabled={loading}
          icon={loading ? <SyncOutlined spin /> : null}
          className="h-11 font-medium"
        >
          {loading ? t('auth.loggingIn', '登录中...') : t('auth.login', '登录')}
        </Button>
      </form>

      {/* 分隔线 */}
      <Divider className="!my-6 !text-[var(--color-text-tertiary)]">
        <span className="text-xs">{t('auth.orContinueWith', '或使用其他方式')}</span>
      </Divider>

      {/* 社交登录 */}
      <div className="flex justify-center gap-4 mb-6">
        <Button
          shape="circle"
          size="large"
          icon={<GithubOutlined />}
          onClick={() => handleSocialLogin('github')}
          className="!flex items-center justify-center"
        />
        <Button
          shape="circle"
          size="large"
          icon={<WechatOutlined />}
          onClick={() => handleSocialLogin('wechat')}
          className="!flex items-center justify-center"
        />
        <Button
          shape="circle"
          size="large"
          icon={<GoogleOutlined />}
          onClick={() => handleSocialLogin('google')}
          className="!flex items-center justify-center"
        />
      </div>

      {/* 注册入口 */}
      <div className="text-center text-sm">
        <span className="text-[var(--color-text-secondary)]">
          {t('auth.noAccount', '还没有账户？')}
        </span>
        <Button
          type="link"
          onClick={onSwitchToRegister}
          className="!p-0 !ml-1"
        >
          {t('auth.register', '立即注册')}
        </Button>
      </div>

      {/* 测试账户提示 */}
      <div className="mt-6 p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
          {t('auth.testAccounts', '测试账户：')}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
          <p>admin / 123456</p>
          <p>user / 123456</p>
        </div>
      </div>
    </div>
  );
}
