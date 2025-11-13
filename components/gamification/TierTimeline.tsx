'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { useUserTier } from '@/hooks/useUserTier'
import { tierConfigs } from '@/lib/tier-config'
import { CheckCircle, Lock, Star } from 'lucide-react'

interface TierTimelineProps {
  className?: string
}

/**
 * TierTimeline Component
 * Shows all tiers in a timeline with current tier highlighted
 * Memoized for performance
 */
export const TierTimeline = memo(function TierTimeline({
  className = ''
}: TierTimelineProps) {
  const { xp, tier, isLoading } = useUserTier()

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse bg-slate-200 rounded-lg h-20" />
        ))}
      </div>
    )
  }

  if (!xp) {
    return null
  }

  const allTiers = Object.values(tierConfigs)

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`} role="list" aria-label="Tier progression timeline">
      {allTiers.map((tierConfig, index) => {
        const isCompleted = xp.total_xp >= tierConfig.xpRequired
        const isCurrent = tier.id === tierConfig.id
        const isLocked = xp.total_xp < tierConfig.xpRequired

        return (
          <motion.div
            key={tierConfig.id}
            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
              isCurrent
                ? `border-purple-500 bg-purple-50 shadow-lg scale-105`
                : isCompleted
                ? 'border-green-500 bg-green-50'
                : 'border-slate-200 bg-slate-50'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={!isLocked ? { scale: 1.02, y: -2 } : {}}
            role="listitem"
            aria-label={`Tier ${tierConfig.id}: ${tierConfig.name}`}
          >
            <div className={`text-3xl sm:text-4xl ${isLocked ? 'opacity-40' : ''}`}>
              {tierConfig.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-base sm:text-lg ${
                  isCurrent ? 'text-purple-900' : isCompleted ? 'text-green-900' : 'text-slate-700'
                }`}>
                  {tierConfig.name}
                </h3>
                {isCurrent && (
                  <motion.div
                    className="w-2 h-2 bg-purple-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    aria-label="Current tier"
                  />
                )}
              </div>
              <p className={`text-xs sm:text-sm ${
                isLocked ? 'text-slate-500' : 'text-slate-600'
              }`}>
                {tierConfig.xpRequired.toLocaleString()} XP
              </p>
              {!isLocked && (
                <div className="mt-2 space-y-1">
                  {tierConfig.perks.slice(0, 2).map((perk, i) => (
                    <p key={i} className="text-xs text-slate-600">• {perk}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              {isCompleted ? (
                <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" aria-label="Tier completed" />
              ) : isCurrent ? (
                <Star className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" aria-label="Current tier" />
              ) : (
                <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" aria-label="Tier locked" />
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
})

