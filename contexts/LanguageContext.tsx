'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Language = 'es' | 'en'

const STORAGE_KEY = 'preferred-language'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function getInitialLanguage(): Language {
  // Crowd Conscious is Spanish-first. Pulse markets, blog posts, and
  // community comms are authored in Spanish for a Mexican audience; users
  // who speak English can flip the toggle in the nav. We do NOT auto-pick
  // the browser's `navigator.language` — that produced English-default
  // shares for anyone outside Latin America/Spain even when the
  // referenced content was a Spanish-only Pulse, which is the wrong
  // first impression for a freshly shared Pulse link.
  if (typeof window === 'undefined') return 'es'
  const saved = localStorage.getItem(STORAGE_KEY) as Language | null
  if (saved && (saved === 'es' || saved === 'en')) return saved
  return 'es'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const lang = getInitialLanguage()
    setLanguageState(lang)
    document.cookie = `${STORAGE_KEY}=${lang};path=/;max-age=31536000`
    setMounted(true)
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang)
      document.cookie = `${STORAGE_KEY}=${lang};path=/;max-age=31536000`
      document.documentElement.lang = lang === 'es' ? 'es' : 'en'
    }
  }, [])

  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.lang = language === 'es' ? 'es' : 'en'
    }
  }, [language, mounted])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    return {
      language: 'es' as Language,
      setLanguage: () => {},
    }
  }
  return ctx
}
