/**
 * i18n 国际化配置
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言文件
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

// 语言资源
const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
};

// 支持的语言列表
export const supportedLanguages = [
  { code: 'zh-CN', name: '简体中文', nativeName: '简体中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
];

// 默认语言
export const defaultLanguage = 'zh-CN';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'amos-claw-language',
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
