'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { useUserTier } from '@/hooks/useUserTier'
import { getTierByXP } from '@/lib/tier-config'
import { TrendingUp } from 'lucide-react'

interface XPProgressBarProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * XPProgressBar Component
 * Shows XP progress with visual progress bar
 * Memoized for performance
 */
export const XPProgressBar = memo(function XPProgressBar({
  className = '',
  showLabel = true,
  size = 'md'
}: XPProgressBarProps) {
  const { xp, tier, progress, isLoading } = useUserTier()

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-slate-200 rounded-full ${size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4'} ${className}`} />
    )
  }

  if (!xp) {
    return null
  }

  const tierConfig = getTierByXP(xp.total_xp)
  const heightClass = size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4'
  const textSizeClass = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'

  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuenow={progress.progress} aria-valuemin={0} aria-valuemax={100}>
      {showLabel && (
        <div className={`flex justify-between ${textSizeClass} text-slate-600 mb-1`}>
          <span className="font-medium">{xp.total_xp.toLocaleString()} XP</span>
          {progress.xpNeeded > 0 && (
            <span className="text-slate-500">{progress.xpNeeded} XP to next tier</span>
          )}
        </div>
      )}
      <div className={`w-full ${heightClass} bg-slate-200 rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full bg-gradient-to-r ${tierConfig.colors.gradient} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${progress.progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          aria-label={`${progress.progress.toFixed(0)}% progress to next tier`}
        />
      </div>
    </div>
  )
})

