'use client'

import { useLanguage } from '@/contexts/LanguageContext'

/**
 * Returns the current locale ('es' | 'en') for market translations.
 * Uses the same source of truth as the language toggle.
 */
export function useLocale(): string {
  const { language } = useLanguage()
  return language || 'es'
}
