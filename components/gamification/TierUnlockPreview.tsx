'use client'

import { useUserTier } from '@/hooks/useUserTier'
import { getTierByXP, getNextTier, tierConfigs } from '@/lib/tier-config'
import { motion } from 'framer-motion'
import { Zap, Palette, Star, Crown, Users } from 'lucide-react'

interface TierUnlockPreviewProps {
  compact?: boolean
}

export function TierUnlockPreview({ compact = false }: TierUnlockPreviewProps) {
  const { xp, tier, progress, isLoading } = useUserTier()

  if (isLoading || !xp) {
    return null
  }

  const currentTier = getTierByXP(xp.total_xp)
  const nextTier = getNextTier(xp.total_xp)

  if (!nextTier) {
    return null // Max tier reached
  }

  const xpNeeded = nextTier.xpRequired - xp.total_xp

  // Get icon for perk type
  const getPerkIcon = (perk: string) => {
    if (perk.toLowerCase().includes('theme') || perk.toLowerCase().includes('color')) {
      return <Palette className="w-4 h-4" />
    }
    if (perk.toLowerCase().includes('support') || perk.toLowerCase().includes('priority')) {
      return <Zap className="w-4 h-4" />
    }
    if (perk.toLowerCase().includes('leaderboard') || perk.toLowerCase().includes('recognition')) {
      return <Star className="w-4 h-4" />
    }
    if (perk.toLowerCase().includes('exclusive') || perk.toLowerCase().includes('legend')) {
      return <Crown className="w-4 h-4" />
    }
    if (perk.toLowerCase().includes('community') || perk.toLowerCase().includes('access')) {
      return <Users className="w-4 h-4" />
    }
    return <Zap className="w-4 h-4" />
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-200 rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{nextTier.icon}</div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">
                Unlock {nextTier.name} at {nextTier.xpRequired.toLocaleString()} XP
              </h4>
              <p className="text-xs text-slate-600">
                {xpNeeded.toLocaleString()} XP to go
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-teal-600">
              {Math.round(progress.progress)}%
            </div>
            <div className="text-xs text-slate-500">progress</div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="text-4xl p-3 rounded-lg text-white"
          style={{
            background: `linear-gradient(135deg, ${nextTier.colors.primary} 0%, ${nextTier.colors.secondary} 100%)`
          }}
        >
          {nextTier.icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Unlock {nextTier.name}
          </h3>
          <p className="text-sm text-slate-600">
            Reach {nextTier.xpRequired.toLocaleString()} XP to unlock new features
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600">
            {xp.total_xp.toLocaleString()} / {nextTier.xpRequired.toLocaleString()} XP
          </span>
          <span className="font-semibold text-teal-600">
            {xpNeeded.toLocaleString()} XP needed
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full"
            style={{
              background: `linear-gradient(135deg, ${nextTier.colors.primary} 0%, ${nextTier.colors.secondary} 100%)`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress.progress, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Unlock Preview */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700 mb-2">
          What you'll unlock:
        </p>
        {nextTier.perks.slice(0, 3).map((perk, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2 text-sm text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className={`text-teal-500 ${nextTier.colors.gradient.includes('purple') ? 'text-purple-500' : ''}`}>
              {getPerkIcon(perk)}
            </div>
            <span>{perk}</span>
          </motion.div>
        ))}
        {nextTier.perks.length > 3 && (
          <p className="text-xs text-slate-500 mt-2">
            +{nextTier.perks.length - 3} more perks
          </p>
        )}
      </div>
    </motion.div>
  )
}

