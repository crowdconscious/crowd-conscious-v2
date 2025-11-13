'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { useUserTier } from '@/hooks/useUserTier'
import { getTierByXP } from '@/lib/tier-config'
import { TrendingUp, Sparkles } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface XPBadgeProps {
  variant?: 'compact' | 'full' | 'minimal'
  showTier?: boolean
  className?: string
  animated?: boolean
}

/**
 * XPBadge Component
 * Displays user's XP and tier in a compact badge
 * Can be used in header, profile, or anywhere XP should be shown
 */
export const XPBadge = memo(function XPBadge({
  variant = 'compact',
  showTier = true,
  className = '',
  animated = true
}: XPBadgeProps) {
  const { xp, tier, isLoading } = useUserTier()
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-slate-200 rounded-full ${variant === 'minimal' ? 'w-16 h-6' : 'w-24 h-8'} ${className}`} />
    )
  }

  if (!xp) {
    return null
  }

  const tierConfig = getTierByXP(xp.total_xp)

  // Minimal variant - just icon + number
  if (variant === 'minimal') {
    return (
      <motion.div
        className={`flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${tierConfig.colors.gradient} text-white text-xs font-semibold ${className}`}
        initial={animated && !prefersReducedMotion ? { scale: 0 } : false}
        animate={animated && !prefersReducedMotion ? { scale: 1 } : false}
        transition={{ type: 'spring', duration: 0.3 }}
        whileHover={animated && !prefersReducedMotion ? { scale: 1.05 } : {}}
      >
        <Sparkles className="w-3 h-3" />
        <span>{xp.total_xp.toLocaleString()}</span>
      </motion.div>
    )
  }

  // Compact variant - icon + XP + tier name
  if (variant === 'compact') {
    return (
      <motion.div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${tierConfig.colors.gradient} text-white text-sm font-medium shadow-sm ${className}`}
        initial={animated && !prefersReducedMotion ? { opacity: 0, x: -10 } : false}
        animate={animated && !prefersReducedMotion ? { opacity: 1, x: 0 } : false}
        transition={{ duration: 0.3 }}
        whileHover={animated && !prefersReducedMotion ? { scale: 1.05 } : {}}
      >
        <div className="text-lg">{tierConfig.icon}</div>
        <div className="flex flex-col">
          <span className="text-xs opacity-90 leading-tight">{showTier ? tierConfig.name : 'XP'}</span>
          <span className="font-bold leading-tight">{xp.total_xp.toLocaleString()}</span>
        </div>
      </motion.div>
    )
  }

  // Full variant - icon + XP + tier + progress
  return (
    <motion.div
      className={`p-3 rounded-xl bg-gradient-to-r ${tierConfig.colors.gradient} text-white shadow-lg ${className}`}
      initial={animated && !prefersReducedMotion ? { opacity: 0, y: 10 } : false}
      animate={animated && !prefersReducedMotion ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.3 }}
      whileHover={animated && !prefersReducedMotion ? { scale: 1.02, y: -2 } : {}}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-2xl">{tierConfig.icon}</div>
          <div>
            <div className="font-bold text-sm">{tierConfig.name}</div>
            <div className="text-xs opacity-90">{xp.total_xp.toLocaleString()} XP</div>
          </div>
        </div>
        <TrendingUp className="w-5 h-5 opacity-80" />
      </div>
      {tier.progress && tier.progress.xpNeeded > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs opacity-90 mb-1">
            <span>Next tier</span>
            <span>{tier.progress.xpNeeded} XP</span>
          </div>
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${tier.progress.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
})

