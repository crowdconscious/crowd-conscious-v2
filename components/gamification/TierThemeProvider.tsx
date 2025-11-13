'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useUserTier } from '@/hooks/useUserTier'
import { tierConfigs } from '@/lib/tier-config'

interface TierThemeContextType {
  tier: ReturnType<typeof useUserTier>['tier']
  xp: ReturnType<typeof useUserTier>['xp']
  applyTheme: () => void
}

const TierThemeContext = createContext<TierThemeContextType | null>(null)

export function useTierTheme() {
  const context = useContext(TierThemeContext)
  if (!context) {
    throw new Error('useTierTheme must be used within TierThemeProvider')
  }
  return context
}

interface TierThemeProviderProps {
  children: ReactNode
}

/**
 * TierThemeProvider
 * Applies tier-based themes to the entire app
 * Changes dashboard colors, backgrounds, and accents based on user tier
 */
export function TierThemeProvider({ children }: TierThemeProviderProps) {
  const { tier, xp } = useUserTier()

  const applyTheme = () => {
    if (!tier || !xp) {
      // Default to tier 1 if no data
      const root = document.documentElement
      root.classList.remove('tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-5', 'legend-tier')
      root.classList.add('tier-1')
      return
    }

    const tierConfig = tierConfigs[tier.id]
    if (!tierConfig) return

    const root = document.documentElement

    // Apply tier colors as CSS variables
    root.style.setProperty('--tier-primary', tierConfig.colors.primary)
    root.style.setProperty('--tier-secondary', tierConfig.colors.secondary)
    
    // Convert Tailwind gradient classes to CSS gradient
    const gradientMap: Record<string, string> = {
      'from-gray-500 to-gray-400': 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
      'from-cyan-500 to-blue-500': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      'from-purple-500 to-pink-500': 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      'from-amber-500 to-orange-500': 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
      'from-red-400 via-purple-500 to-cyan-400': 'linear-gradient(135deg, #f87171 0%, #a855f7 50%, #22d3ee 100%)',
    }
    
    const gradientValue = gradientMap[tierConfig.colors.gradient] || gradientMap['from-gray-500 to-gray-400']
    root.style.setProperty('--tier-gradient', gradientValue)

    // Apply tier-based background gradient
    if (tier.id === 5) {
      // Legend tier - animated rainbow
      root.classList.add('legend-tier')
      root.style.setProperty('--tier-bg', 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 25%, #45b7d1 50%, #a855f7 75%, #ff6b6b 100%)')
    } else {
      root.classList.remove('legend-tier')
      // Use tier gradient for background accent
      const bgGradientMap: Record<number, string> = {
        1: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', // Gray
        2: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', // Blue/Cyan
        3: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', // Purple/Pink
        4: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', // Gold/Orange
      }
      root.style.setProperty('--tier-bg', bgGradientMap[tier.id] || bgGradientMap[1])
    }

    // Add tier class for CSS targeting
    root.classList.remove('tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-5')
    root.classList.add(`tier-${tier.id}`)
  }

  useEffect(() => {
    applyTheme()
  }, [tier, xp])

  return (
    <TierThemeContext.Provider value={{ tier, xp, applyTheme }}>
      {children}
    </TierThemeContext.Provider>
  )
}

