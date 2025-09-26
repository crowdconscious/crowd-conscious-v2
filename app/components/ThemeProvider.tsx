'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { themeConfig, type Theme } from '@/lib/design-system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({
  children,
  defaultTheme = themeConfig.defaultTheme,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Get system theme preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }

  // Resolve the actual theme to apply
  const resolveTheme = (theme: Theme): 'light' | 'dark' => {
    if (theme === 'system') {
      return getSystemTheme()
    }
    return theme
  }

  // Apply theme to document
  const applyTheme = (theme: 'light' | 'dark') => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement
      
      // Remove existing theme classes
      root.classList.remove('light', 'dark')
      root.removeAttribute('data-theme')
      
      // Apply new theme
      root.classList.add(theme)
      root.setAttribute('data-theme', theme)
      
      // Update color-scheme for better native styling
      root.style.colorScheme = theme
    }
  }

  // Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(themeConfig.storageKey, newTheme)
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error)
      }
    }
    
    const resolved = resolveTheme(newTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }

  // Initialize theme on mount
  useEffect(() => {
    let savedTheme = defaultTheme

    // Try to get saved theme from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(themeConfig.storageKey)
        if (stored && themeConfig.themes.includes(stored as Theme)) {
          savedTheme = stored as Theme
        }
      } catch (error) {
        console.warn('Failed to load theme from localStorage:', error)
      }
    }

    setThemeState(savedTheme)
    const resolved = resolveTheme(savedTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
    setMounted(true)
  }, [defaultTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme()
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="animate-pulse bg-neutral-50 dark:bg-neutral-950 min-h-screen">
        {children}
      </div>
    )
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// Theme toggle button component
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getThemeIcon = () => {
    if (theme === 'system') {
      return resolvedTheme === 'dark' ? '🌙' : '☀️'
    }
    return theme === 'dark' ? '🌙' : '☀️'
  }

  const getThemeLabel = () => {
    if (theme === 'system') {
      return `System (${resolvedTheme})`
    }
    return theme === 'dark' ? 'Dark' : 'Light'
  }

  return (
    <button
      onClick={toggleTheme}
      className="
        inline-flex items-center justify-center gap-2 
        px-3 py-2 text-sm font-medium 
        rounded-lg border border-neutral-200 
        bg-white hover:bg-neutral-50 
        dark:border-neutral-700 dark:bg-neutral-800 
        dark:hover:bg-neutral-700 
        transition-all duration-200 
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
      "
      title={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
    >
      <span className="text-lg">{getThemeIcon()}</span>
      <span className="hidden sm:inline">{getThemeLabel()}</span>
    </button>
  )
}

export default ThemeProvider
