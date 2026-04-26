import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from '../locales/en/common.json'
import ruCommon from '../locales/ru/common.json'

export const SUPPORTED_LANGUAGES = ['en', 'ru'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const FALLBACK_LANGUAGE: SupportedLanguage = 'en'

const resources = {
  en: { common: enCommon },
  ru: { common: ruCommon },
} as const

void i18n.use(initReactI18next).init({
  resources,
  // Initial language is set deterministically here; once the user's settings
  // load (see src/App.tsx), `applyLanguage()` switches to their stored choice.
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  defaultNS: 'common',
  ns: ['common'],
  interpolation: {
    // React already escapes by default.
    escapeValue: false,
  },
  returnNull: false,
})

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

/**
 * Detect the OS/browser locale and return a supported language tag if it
 * matches one we ship. Used as a one-time fallback on first launch when the
 * user has not yet picked a language in Settings (settings.language === null).
 */
export function detectOsLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return FALLBACK_LANGUAGE
  const candidates = [navigator.language, ...(navigator.languages ?? [])]
  for (const candidate of candidates) {
    const tag = candidate?.toLowerCase().split(/[-_]/)[0]
    if (isSupportedLanguage(tag)) return tag
  }
  return FALLBACK_LANGUAGE
}

/**
 * Switch the active language. When `value` is a supported tag, that is used.
 * When `value` is null/undefined/unsupported, the OS locale is detected
 * (e.g. Russian Windows → 'ru'). Safe to call on every settings change -
 * i18next no-ops when the language is unchanged.
 */
export function applyLanguage(value: unknown): SupportedLanguage {
  const next = isSupportedLanguage(value) ? value : detectOsLanguage()
  if (i18n.language !== next) {
    void i18n.changeLanguage(next)
  }
  return next
}

export default i18n
