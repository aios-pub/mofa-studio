/**
 * i18n Internationalization configuration
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// 导入Language文件
import zhCN from "./locales/zh-CN.json";
import enUS from "./locales/en-US.json";

// Language resources
const resources = {
  "zh-CN": {
    translation: zhCN,
  },
  "en-US": {
    translation: enUS,
  },
};

// Supported language list
export const supportedLanguages = [
  { code: "zh-CN", name: "简体中文", nativeName: "简体中文" },
  { code: "en-US", name: "English", nativeName: "English" },
];

// Default language
export const defaultLanguage = "zh-CN";

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
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "mofa-studio-language",
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
