import { createI18n } from 'vue-i18n'
import zh from './locales/zh.json'
import en from './locales/en.json'

// Read the language setting from sessionStorage; if not set, use the browser language
let savedLocale = sessionStorage.getItem('appLocale');

// If there is no language setting in sessionStorage, detect the browser language
if (!savedLocale) {
  const browserLocale = navigator.language || navigator.languages?.[0] || 'zh';
  // Use Chinese if the browser language is Chinese (including zh-CN, zh-TW, etc.), otherwise use English
  savedLocale = browserLocale.startsWith('zh') ? 'zh' : 'en';
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: savedLocale, // Use the saved language or the default language
  fallbackLocale: 'en',
  interpolation: {
    escapeValue: true // Defaults to true, ensuring curly-brace escaping takes effect
  },
  messages: {
    zh,
    en
  }
})

export default i18n
