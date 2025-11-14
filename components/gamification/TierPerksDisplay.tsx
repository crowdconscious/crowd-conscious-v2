'use client'

import { useUserTier } from '@/hooks/useUserTier'
import { getTierByXP, tierConfigs } from '@/lib/tier-config'
import { motion } from 'framer-motion'
import { CheckCircle2, Lock, Zap, Palette, Star, Crown, Users, Gift, Sparkles } from 'lucide-react'

export function TierPerksDisplay() {
  const { xp, tier, isLoading } = useUserTier()

  if (isLoading || !xp) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    )
  }

  const currentTier = getTierByXP(xp.total_xp)
  const allTiers = [1, 2, 3, 4, 5].map(tierId => tierConfigs[tierId])

  const getPerkIcon = (perk: string) => {
    const perkLower = perk.toLowerCase()
    if (perkLower.includes('theme') || perkLower.includes('color')) return <Palette className="w-5 h-5" />
    if (perkLower.includes('support') || perkLower.includes('priority')) return <Zap className="w-5 h-5" />
    if (perkLower.includes('leaderboard') || perkLower.includes('recognition')) return <Star className="w-5 h-5" />
    if (perkLower.includes('exclusive') || perkLower.includes('legend')) return <Crown className="w-5 h-5" />
    if (perkLower.includes('community') || perkLower.includes('access')) return <Users className="w-5 h-5" />
    if (perkLower.includes('early') || perkLower.includes('access')) return <Gift className="w-5 h-5" />
    return <Sparkles className="w-5 h-5" />
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Crown className="w-6 h-6 text-teal-600" />
        <h2 className="text-xl font-semibold text-slate-900">Tier Perks</h2>
      </div>

      <div className="space-y-6">
        {allTiers.map((tierConfig, index) => {
          const isUnlocked = currentTier.id >= tierConfig.id
          const isCurrent = currentTier.id === tierConfig.id

          return (
            <motion.div
              key={tierConfig.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border-2 ${
                isCurrent
                  ? 'border-teal-500 bg-teal-50'
                  : isUnlocked
                  ? 'border-green-300 bg-green-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                    {tierConfig.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{tierConfig.name}</h3>
                    <p className="text-sm text-slate-600">{tierConfig.xpRequired.toLocaleString()} XP required</p>
                  </div>
                </div>
                <div>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-600 text-white text-xs font-medium rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Current
                    </span>
                  )}
                  {isUnlocked && !isCurrent && (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  )}
                  {!isUnlocked && (
                    <Lock className="w-6 h-6 text-slate-400" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {tierConfig.perks.map((perk, perkIndex) => (
                  <div
                    key={perkIndex}
                    className={`flex items-center gap-2 text-sm ${
                      isUnlocked ? 'text-slate-700' : 'text-slate-500'
                    }`}
                  >
                    {isUnlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <div className={`flex items-center gap-2 ${isUnlocked ? 'text-teal-600' : 'text-slate-400'}`}>
                      {getPerkIcon(perk)}
                    </div>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-200 rounded-lg">
        <p className="text-sm text-teal-800">
          <strong>💡 Note:</strong> Perks are automatically unlocked when you reach each tier. Some perks may require additional setup or activation.
        </p>
      </div>
    </div>
  )
}

