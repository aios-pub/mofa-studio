/**
 * 登录/注册页面
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { useAppStore } from "../../stores";
import { useIsAuthenticated } from "../../stores/useUserStore";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme, language, setLanguage } = useAppStore();
  const isAuthenticated = useIsAuthenticated();
  const [mode, setMode] = useState<AuthMode>("login");

  // e.g.果已登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex">
      {/* 左侧 - 表单区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-end gap-2 p-4">
          {/* Language切换 */}
          <div className="relative group">
            <button className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-(--color-bg-tertiary) transition-colors">
              <GlobalOutlined />
            </button>
            <div className="absolute right-0 top-full mt-1 py-1 bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => setLanguage("zh-CN")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-(--color-bg-tertiary) ${
                  language === "zh-CN"
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage("en-US")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-(--color-bg-tertiary) ${
                  language === "en-US"
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Theme切换 */}
          <div className="relative group">
            <button className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-(--color-bg-tertiary) transition-colors">
              {theme === "light" ? (
                <SunOutlined />
              ) : theme === "dark" ? (
                <MoonOutlined />
              ) : (
                <DesktopOutlined />
              )}
            </button>
            <div className="absolute right-0 top-full mt-1 py-1 bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => setTheme("light")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-(--color-bg-tertiary) flex items-center gap-2 ${
                  theme === "light"
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                <SunOutlined />
                {t("theme.light", "浅色")}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-(--color-bg-tertiary) flex items-center gap-2 ${
                  theme === "dark"
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                <MoonOutlined />
                {t("theme.dark", "深色")}
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-(--color-bg-tertiary) flex items-center gap-2 ${
                  theme === "system"
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                <DesktopOutlined />
                {t("theme.system", "跟随系统")}
              </button>
            </div>
          </div>
        </div>

        {/* 表单内容 */}
        <div className="flex-1 flex items-center justify-center p-8">
          {mode === "login" ? (
            <LoginForm onSwitchToRegister={() => setMode("register")} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode("login")} />
          )}
        </div>

        {/* 底部版权 */}
        <div className="p-4 text-center text-sm text-[var(--color-text-tertiary)]">
          © {new Date().getFullYear()} mofa-studio.{" "}
          {t("common.allRightsReserved", "保留所有权利")}
        </div>
      </div>

      {/* 右侧 - 装饰区域 */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[var(--color-primary)] to-purple-600 items-center justify-center p-12">
        <div className="max-w-lg text-white">
          <h2 className="text-4xl font-bold mb-6">
            {t("auth.heroTitle", "AI Agent 管理平台")}
          </h2>
          <p className="text-lg opacity-90 mb-8">
            {t(
              "auth.heroDesc",
              "一站式管理和监控您的 AI Agent，提供强大的提示词管理、对话追踪和性能评估功能。",
            )}
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <span>{t("auth.feature1", "多 Agent 协同管理")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <span>{t("auth.feature2", "实时性能监控")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-xl">🔧</span>
              </div>
              <span>{t("auth.feature3", "灵活的提示词配置")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
