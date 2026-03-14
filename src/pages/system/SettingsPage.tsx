/**
 * 设置页面
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SettingOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
  DesktopOutlined,
  CodeOutlined,
  BellOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  UploadOutlined,
  InfoCircleOutlined,
  RightOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useAppStore, type SupportedLanguage } from '../../stores/useAppStore';
import { supportedLanguages } from '../../i18n';
import { getShortcutDefinitions } from '../../hooks/useKeyboardShortcuts';

type SettingsTab = 'general' | 'appearance' | 'shortcuts' | 'data' | 'about';

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs = [
    { id: 'general' as const, label: t('settings.general'), icon: SettingOutlined },
    { id: 'appearance' as const, label: t('settings.appearance'), icon: MoonOutlined },
    { id: 'shortcuts' as const, label: t('settings.keyboardShortcuts'), icon: CodeOutlined },
    { id: 'data' as const, label: t('settings.data'), icon: DatabaseOutlined },
    { id: 'about' as const, label: t('settings.about'), icon: InfoCircleOutlined },
  ];

  return (
    <div className="h-full flex">
      {/* 左侧导航 */}
      <div className="w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          {t('settings.title')}
        </h2>
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon />
                <span className="flex-1">{tab.label}</span>
                <RightOutlined className={`${activeTab === tab.id ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'shortcuts' && <ShortcutsSettings />}
        {activeTab === 'data' && <DataSettings />}
        {activeTab === 'about' && <AboutSettings />}
      </div>
    </div>
  );
}

// 通用设置
function GeneralSettings() {
  const { t } = useTranslation();
  const { language, setLanguage } = useAppStore();
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">
        {t('settings.general')}
      </h3>

      <div className="space-y-6">
        {/* 语言设置 */}
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
              <GlobalOutlined className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)]">{t('settings.language')}</h4>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Choose your preferred language
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code as SupportedLanguage)}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  language === lang.code
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                <span className="text-[var(--color-text-primary)]">{lang.nativeName}</span>
                {language === lang.code && (
                  <CheckOutlined className="text-[var(--color-primary)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 通知设置 */}
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
              <BellOutlined className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)]">{t('settings.notifications')}</h4>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Configure notification preferences
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <NotificationToggle
              label="Desktop notifications"
              description="Show desktop notifications for important events"
              defaultChecked
            />
            <NotificationToggle
              label="Sound effects"
              description="Play sound when receiving messages"
              defaultChecked={false}
            />
            <NotificationToggle
              label="Email notifications"
              description="Receive email notifications for critical alerts"
              defaultChecked={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 外观设置
function AppearanceSettings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useAppStore();

  const themeOptions = [
    { id: 'light', label: t('settings.themeOptions.light'), icon: SunOutlined, description: 'Light background' },
    { id: 'dark', label: t('settings.themeOptions.dark'), icon: MoonOutlined, description: 'Dark background' },
    { id: 'system', label: t('settings.themeOptions.system'), icon: DesktopOutlined, description: 'Follow system settings' },
  ];

  return (
    <div>
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">
        {t('settings.appearance')}
      </h3>

      <div className="space-y-6">
        {/* 主题设置 */}
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
              <MoonOutlined className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)]">{t('settings.theme')}</h4>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Choose your preferred theme
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setTheme(option.id as 'light' | 'dark' | 'system')}
                  className={`flex flex-col items-center p-4 rounded-lg border transition-colors ${
                    theme === option.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  <Icon className={`text-2xl mb-2 ${theme === option.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`} />
                  <span className="font-medium text-[var(--color-text-primary)]">{option.label}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)] mt-1">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// 快捷键设置
function ShortcutsSettings() {
  const { t } = useTranslation();
  const shortcuts = getShortcutDefinitions();

  return (
    <div>
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">
        {t('settings.keyboardShortcuts')}
      </h3>

      <div className="space-y-4">
        {shortcuts.map((category) => (
          <div
            key={category.category}
            className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]"
          >
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
              {category.category}
            </h4>
            <div className="space-y-2">
              {category.shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-[var(--color-text-primary)]">{shortcut.description}</span>
                  <div className="flex items-center gap-0.5">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="px-2 py-1 text-xs font-mono bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 数据设置
function DataSettings() {
  const { t } = useTranslation();

  const handleExport = () => {
    // 导出所有数据
    const data = {
      conversations: JSON.parse(localStorage.getItem('amos-claw-conversations') || '[]'),
      agents: JSON.parse(localStorage.getItem('amos-claw-agents') || '[]'),
      prompts: JSON.parse(localStorage.getItem('amos-claw-prompts') || '[]'),
      settings: JSON.parse(localStorage.getItem('amos-claw-app-store') || '{}'),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amos-claw-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.conversations) {
            localStorage.setItem('amos-claw-conversations', JSON.stringify(data.conversations));
          }
          if (data.agents) {
            localStorage.setItem('amos-claw-agents', JSON.stringify(data.agents));
          }
          if (data.prompts) {
            localStorage.setItem('amos-claw-prompts', JSON.stringify(data.prompts));
          }
          if (data.settings) {
            localStorage.setItem('amos-claw-app-store', JSON.stringify(data.settings));
          }
          alert('Data imported successfully! Please refresh the page.');
        } catch {
          alert('Failed to import data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">
        {t('settings.data')}
      </h3>

      <div className="space-y-4">
        {/* 备份数据 */}
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
              <DownloadOutlined className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)]">{t('settings.backup')}</h4>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Export all your data to a JSON file
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
          >
            <DownloadOutlined />
            Export Data
          </button>
        </div>

        {/* 恢复数据 */}
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <UploadOutlined className="text-orange-500" />
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)]">{t('settings.restore')}</h4>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Import data from a backup file
              </p>
            </div>
          </div>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-bg-base)]"
          >
            <UploadOutlined />
            Import Data
          </button>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
            Warning: Importing data will overwrite existing data
          </p>
        </div>
      </div>
    </div>
  );
}

// 关于页面
function AboutSettings() {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">
        {t('settings.about')}
      </h3>

      <div className="p-6 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center">
            <span className="text-3xl">🤖</span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Amos-Claw</h2>
          <p className="text-[var(--color-text-secondary)] mt-1">AI Dialogue Platform</p>

          <div className="mt-4 py-2 px-4 bg-[var(--color-bg-tertiary)] rounded-lg inline-block">
            <span className="text-sm text-[var(--color-text-secondary)]">{t('settings.version')}: </span>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">0.1.0</span>
          </div>

          <p className="mt-6 text-sm text-[var(--color-text-tertiary)] max-w-md mx-auto">
            A powerful AI dialogue platform desktop client built with Tauri, React, and TypeScript.
            Manage agents, prompts, skills, and more with an intuitive interface.
          </p>

          <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Built with ❤️ using Tauri + React + TypeScript
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 通知开关组件
function NotificationToggle({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{description}</p>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
