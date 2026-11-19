'use client'

import { useEffect, useState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'

const THEME_KEY = 'ciceron-theme'

export type CiceronTheme = 'dark' | 'light'

function applyTheme(theme: CiceronTheme) {
  const root = document.querySelector('.ciceron-root')
  if (!root) return
  root.setAttribute('data-theme', theme)
  root.classList.toggle('is-light', theme === 'light')
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<CiceronTheme>('dark')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_KEY)
      const next: CiceronTheme = stored === 'light' ? 'light' : 'dark'
      setTheme(next)
      applyTheme(next)
    } catch {
      applyTheme('dark')
    }
  }, [])

  function toggle() {
    setTheme((prev) => {
      const next: CiceronTheme = prev === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(THEME_KEY, next)
      } catch {
        /* ignore */
      }
      applyTheme(next)
      return next
    })
  }

  const label =
    theme === 'dark' ? copy.theme.toLight : copy.theme.toDark

  return (
    <button
      type="button"
      className="cic-theme-toggle"
      onClick={toggle}
      aria-pressed={theme === 'light'}
      title={label}
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>{label}</span>
    </button>
  )
}
