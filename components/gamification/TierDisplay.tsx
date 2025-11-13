'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { useUserTier } from '@/hooks/useUserTier'
import { getTierByXP, tierConfigs } from '@/lib/tier-config'
import { Trophy, TrendingUp, Lock } from 'lucide-react'

interface TierDisplayProps {
  className?: string
  showProgress?: boolean
  compact?: boolean
}

/**
 * TierDisplay Component
 * Shows user's current tier with visual styling
 * Memoized for performance
 */
export const TierDisplay = memo(function TierDisplay({
  className = '',
  showProgress = true,
  compact = false
}: TierDisplayProps) {
  const { xp, tier, progress, isLoading } = useUserTier()

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-slate-200 rounded-xl h-24 ${className}`} />
    )
  }

  if (!xp) {
    return null
  }

  const tierConfig = getTierByXP(xp.total_xp)
  const nextTier = progress.xpNeeded > 0 ? tierConfigs[tierConfig.id + 1] : null

  return (
    <motion.div
      className={`rounded-xl p-4 sm:p-6 bg-gradient-to-r ${tierConfig.colors.gradient} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="region"
      aria-label="User tier information"
    >
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="text-3xl sm:text-4xl">{tierConfig.icon}</div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold">{tierConfig.name}</h3>
            <p className="text-sm sm:text-base opacity-90">{xp.total_xp.toLocaleString()} XP</p>
          </div>
        </div>
        {!compact && (
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
        )}
      </div>

      {showProgress && nextTier && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs sm:text-sm text-white/90 mb-1">
            <span>Progress to {nextTier.name}</span>
            <span>{progress.xpNeeded} XP needed</span>
          </div>
          <div className="w-full h-2 sm:h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-white rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${progress.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              aria-label={`${progress.progress.toFixed(0)}% progress to next tier`}
            />
          </div>
        </div>
      )}

      {!nextTier && (
        <div className="mt-4 flex items-center gap-2 text-white/90">
          <Trophy className="w-5 h-5" />
          <span className="text-sm sm:text-base">Maximum tier reached!</span>
        </div>
      )}
    </motion.div>
  )
})

