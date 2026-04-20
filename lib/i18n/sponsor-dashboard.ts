/**
 * Sponsor dashboard i18n helper.
 *
 * The sponsor dashboard tree is not wrapped in NextIntlClientProvider today
 * (root app shell uses the cookie-based LanguageContext pattern). Rather than
 * rewiring the provider surface just for this PR, we ship a small typed
 * reader that imports the JSON namespace directly and selects ES/EN via
 * `useLanguage()`.
 *
 * Strings live in `locales/es.json` / `locales/en.json` under
 * `sponsor_dashboard.*` — identical shape, so a future migration to
 * `useTranslations('sponsor_dashboard')` is a pure find-and-replace.
 */

'use client'

import esDict from '@/locales/es.json'
import enDict from '@/locales/en.json'
import { useLanguage, type Language } from '@/contexts/LanguageContext'

type SponsorDashboardDict = typeof esDict extends { sponsor_dashboard: infer T } ? T : never

type Dot<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? Dot<T[K], `${Prefix}${K}.`>
      : never
}[keyof T & string]

export type SponsorDashboardKey = Dot<SponsorDashboardDict>

function lookup(dict: SponsorDashboardDict, key: string): string | undefined {
  const parts = key.split('.')
  let cursor: unknown = dict
  for (const p of parts) {
    if (cursor && typeof cursor === 'object' && p in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return typeof cursor === 'string' ? cursor : undefined
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`
  )
}

export type SponsorT = (key: SponsorDashboardKey, vars?: Record<string, string | number>) => string

/**
 * Read sponsor_dashboard.* strings using the active cookie locale.
 * Falls back to ES if a key is missing from EN (common during translation
 * gaps) and to the key itself if missing from both (surfaces bugs early).
 */
export function useSponsorT(): { t: SponsorT; language: Language } {
  const { language } = useLanguage()
  const t: SponsorT = (key, vars) => {
    const primary = language === 'en' ? enDict.sponsor_dashboard : esDict.sponsor_dashboard
    const fallback = esDict.sponsor_dashboard
    const raw =
      lookup(primary as SponsorDashboardDict, key) ??
      lookup(fallback as SponsorDashboardDict, key) ??
      key
    return interpolate(raw, vars)
  }
  return { t, language }
}
