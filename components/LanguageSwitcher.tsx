'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ]

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]

  const changeLanguage = (newLocale: string) => {
    setIsOpen(false)
    
    startTransition(() => {
      // Get current path without locale prefix
      let newPathname = pathname
      
      // Remove existing locale prefix if present
      if (pathname.startsWith('/en') || pathname.startsWith('/es')) {
        newPathname = pathname.slice(3) || '/'
      }

      // Add new locale prefix only if not default (es)
      if (newLocale !== 'es') {
        newPathname = `/${newLocale}${newPathname}`
      }

      router.replace(newPathname)
    })
  }

  return (
    <div className="relative">
      {/* Current Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
          hover:bg-slate-50 dark:hover:bg-slate-700
          transition-all duration-200
          ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label="Change language"
      >
        <span className="text-xl">{currentLanguage.flag}</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
          {currentLanguage.code.toUpperCase()}
        </span>
        <svg 
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                disabled={isPending}
                className={`
                  w-full flex items-center gap-3 px-4 py-3
                  hover:bg-slate-50 dark:hover:bg-slate-700
                  transition-colors duration-150
                  ${locale === language.code ? 'bg-teal-50 dark:bg-teal-900/20' : ''}
                  ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span className="text-2xl">{language.flag}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {language.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {language.code.toUpperCase()}
                  </div>
                </div>
                {locale === language.code && (
                  <svg 
                    className="w-5 h-5 text-teal-600 dark:text-teal-400" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Loading indicator */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 rounded-lg">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

