import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ms from './locales/ms.json'

export const SUPPORTED_LOCALES = ['en', 'ms'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'en'
export const LOCALE_STORAGE_KEY = 'appLocale'

// BCP 47 tags for the <html lang> attribute and Intl date/number formatting
export const LOCALE_TAGS: Record<AppLocale, string> = {
  en: 'en-US',
  ms: 'ms-MY',
}

const isSupportedLocale = (value: unknown): value is AppLocale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)

// English unless the user picked another language earlier. Storage access can throw
// (private mode, blocked site data), so fall back to the default instead of failing.
function readSavedLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isSupportedLocale(saved) ? saved : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

const initialLocale = readSavedLocale()

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: initialLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    en,
    ms,
  },
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = LOCALE_TAGS[initialLocale]
}

// Switches the UI language, remembers it for the next visit and updates <html lang>
export function setAppLocale(value: string): void {
  const next = isSupportedLocale(value) ? value : DEFAULT_LOCALE
  i18n.global.locale.value = next
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
  } catch {
    // The choice still applies for this session
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = LOCALE_TAGS[next]
  }
}

export default i18n
