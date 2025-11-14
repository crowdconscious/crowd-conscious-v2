'use client'

import { useUserTier } from '@/hooks/useUserTier'
import { getTierByXP, getNextTier, tierConfigs } from '@/lib/tier-config'
import { motion } from 'framer-motion'
import { Sparkles, Lock, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function TierProgressionCard() {
  const { xp, tier, progress, isLoading } = useUserTier()

  if (isLoading || !xp) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-2/3"></div>
      </div>
    )
  }

  const currentTier = getTierByXP(xp.total_xp)
  const nextTier = getNextTier(xp.total_xp)
  const xpNeeded = nextTier ? nextTier.xpRequired - xp.total_xp : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Current Tier Header */}
      <div 
        className="text-white p-6"
        style={{
          background: `linear-gradient(135deg, ${currentTier.colors.primary} 0%, ${currentTier.colors.secondary} 100%)`
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{currentTier.icon}</span>
              <div>
                <h3 className="text-2xl font-bold">{currentTier.name}</h3>
                <p className="text-white/90 text-sm">Your Current Tier</p>
              </div>
            </div>
            <p className="text-white/90 text-sm mt-2">
              {xp.total_xp.toLocaleString()} XP • {currentTier.perks.length} Active Perks
            </p>
          </div>
          {currentTier.animated && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              <Sparkles className="w-8 h-8" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Current Tier Perks */}
      <div className="p-6 border-b border-slate-200">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Your Active Perks
        </h4>
        <div className="space-y-2">
          {currentTier.perks.map((perk, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              {perk}
            </div>
          ))}
        </div>
      </div>

      {/* Progress to Next Tier */}
      {nextTier && (
        <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-1">
                Next Tier: {nextTier.name} {nextTier.icon}
              </h4>
              <p className="text-sm text-slate-600">
                {xpNeeded > 0 ? (
                  <>
                    <span className="font-semibold text-teal-600">{xpNeeded.toLocaleString()} XP</span> more to unlock
                  </>
                ) : (
                  <span className="font-semibold text-green-600">Ready to level up!</span>
                )}
              </p>
            </div>
            <div className={`text-3xl ${progress.progress >= 100 ? 'animate-bounce' : ''}`}>
              {nextTier.icon}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-600 mb-2">
              <span>{xp.total_xp.toLocaleString()} XP</span>
              <span>{nextTier.xpRequired.toLocaleString()} XP</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full"
                style={{
                  background: `linear-gradient(135deg, ${nextTier.colors.primary} 0%, ${nextTier.colors.secondary} 100%)`
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress.progress, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1 text-center">
              {Math.round(progress.progress)}% complete
            </p>
          </div>

          {/* Next Tier Perks Preview */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
            <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              Unlocks at {nextTier.name}:
            </h5>
            <div className="space-y-2">
              {nextTier.perks.map((perk, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-slate-600">
                  <ArrowRight className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Motivational Message */}
          <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <p className="text-sm text-teal-800">
              {xpNeeded <= 100 ? (
                <>🎉 You're almost there! Just a few more actions to unlock {nextTier.name}!</>
              ) : xpNeeded <= 500 ? (
                <>💪 Keep going! You're making great progress toward {nextTier.name}.</>
              ) : (
                <>🚀 Every action counts! Complete lessons, vote, and create content to level up.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Max Tier Message */}
      {!nextTier && (
        <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-t border-yellow-200">
          <div className="text-center">
            <div className="text-4xl mb-2">👑</div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              You've reached the Legend tier!
            </h4>
            <p className="text-sm text-slate-600 mb-4">
              You've unlocked all features and perks. Keep making an impact!
            </p>
            <Link
              href="/achievements"
              className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              View All Achievements <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-6 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-500 mb-3">Ways to earn XP:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-600">
            <span>📚</span> Complete lesson (+50 XP)
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span>🎓</span> Finish module (+200 XP)
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span>💝</span> Sponsor need (+100 XP)
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span>👍</span> Vote on content (+25 XP)
          </div>
        </div>
      </div>
    </div>
  )
}

