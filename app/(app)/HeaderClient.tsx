'use client'

import { useState, useEffect } from 'react'
import { t, getUserLanguage } from '@/lib/i18n'

interface HeaderClientProps {
  user: any
}

export default function HeaderClient({ user }: HeaderClientProps) {
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    const userLang = getUserLanguage()
    setLanguage(userLang)

    // Listen for language changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'language') {
        setLanguage(e.newValue || 'en')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Crowd Conscious</h1>
            <button className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 transition-colors">
              <span>🔍</span>
              <span>{t('search', language)}</span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-600 text-xs rounded">⌘K</kbd>
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="hidden md:block text-sm text-slate-600 dark:text-slate-300">
              {t('welcome', language)}, {user.full_name || user.email}
            </span>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <span>👤</span>
                <span>{t('profile', language)}</span>
              </a>
              <a
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <span>⚙️</span>
                <span>{t('settings', language)}</span>
              </a>
            </div>
            
            <form action="/auth/signout" method="post">
              <button 
                type="submit"
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                {t('sign_out', language)}
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}
