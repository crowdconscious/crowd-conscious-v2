'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUserAchievements, useUserTier } from '@/hooks/useUserTier'
import { Trophy, Lock, CheckCircle, Sparkles, Target, Award, TrendingUp } from 'lucide-react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import { XPBadge } from '@/components/gamification/XPBadge'

interface AchievementsClientProps {
  user: any
}

interface Achievement {
  id: string
  user_id: string
  achievement_type: string
  achievement_name: string
  achievement_description: string | null
  icon_url: string | null
  unlocked_at: string
}

// Achievement definitions - Impact-focused (no modules/lessons from previous app)
const ACHIEVEMENT_DEFINITIONS = {
  FIRST_VOTE: {
    name: 'Voice Heard',
    description: 'Cast your first prediction',
    icon: '🗳️',
    category: 'impact',
    rarity: 'common'
  },
  VOTE_10: {
    name: 'Active Predictor',
    description: 'Make 10 predictions',
    icon: '📊',
    category: 'impact',
    rarity: 'common'
  },
  VOTE_50: {
    name: 'Democracy Champion',
    description: 'Cast 50 predictions',
    icon: '🏛️',
    category: 'impact',
    rarity: 'rare'
  },
  FIRST_FUND_VOTE: {
    name: 'Fund Voice',
    description: 'Vote for your first cause in the Conscious Fund',
    icon: '💚',
    category: 'impact',
    rarity: 'common'
  },
  FUND_CHAMPION: {
    name: 'Fund Champion',
    description: 'Vote for causes across 5 different months',
    icon: '🌍',
    category: 'impact',
    rarity: 'uncommon'
  },
  FIRST_SPONSORSHIP: {
    name: 'First Contribution',
    description: 'Make your first sponsorship',
    icon: '💝',
    category: 'impact',
    rarity: 'common'
  },
  SPONSOR_10: {
    name: 'Generous Giver',
    description: 'Make 10 sponsorships',
    icon: '🎁',
    category: 'impact',
    rarity: 'uncommon'
  },
  FIRST_CORRECT: {
    name: 'Sharp Insight',
    description: 'Get your first correct prediction',
    icon: '🎯',
    category: 'impact',
    rarity: 'common'
  },
  CORRECT_10: {
    name: 'Accurate Mind',
    description: 'Get 10 correct predictions',
    icon: '✨',
    category: 'impact',
    rarity: 'uncommon'
  },
  TIER_2: {
    name: 'Contributor',
    description: 'Reach Contributor tier',
    icon: '🌊',
    category: 'progression',
    rarity: 'uncommon'
  },
  TIER_3: {
    name: 'Changemaker',
    description: 'Reach Changemaker tier',
    icon: '💜',
    category: 'progression',
    rarity: 'rare'
  },
  TIER_4: {
    name: 'Impact Leader',
    description: 'Reach Impact Leader tier',
    icon: '⭐',
    category: 'progression',
    rarity: 'epic'
  },
  TIER_5: {
    name: 'Legend',
    description: 'Reach Legend tier',
    icon: '👑',
    category: 'progression',
    rarity: 'legendary'
  },
  STREAK_7: {
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    category: 'consistency',
    rarity: 'uncommon'
  },
  STREAK_30: {
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '💪',
    category: 'consistency',
    rarity: 'rare'
  }
}

const CATEGORY_COLORS = {
  impact: 'from-emerald-500 to-teal-500',
  progression: 'from-amber-500 to-orange-500',
  consistency: 'from-red-500 to-rose-500'
}

const RARITY_COLORS = {
  common: 'border-slate-600 bg-slate-800/80',
  uncommon: 'border-emerald-500/50 bg-emerald-500/10',
  rare: 'border-blue-500/50 bg-blue-500/10',
  epic: 'border-purple-500/50 bg-purple-500/10',
  legendary: 'border-amber-500/50 bg-amber-500/10'
}

export default function AchievementsClient({ user }: AchievementsClientProps) {
  const { achievements, isLoading } = useUserAchievements()
  const { tier, xp } = useUserTier()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isCheckingAchievements, setIsCheckingAchievements] = useState(false)
  const [achievementsUnlocked, setAchievementsUnlocked] = useState<number | null>(null)
  const [userStats, setUserStats] = useState<any>(null)

  // Fetch user stats for progress tracking
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await fetch('/api/user-stats')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setUserStats(result.data)
          }
        }
      } catch (error) {
        console.error('Error fetching user stats:', error)
      }
    }
    fetchUserStats()
  }, [])

  // Automatically check and unlock retroactive achievements on mount
  useEffect(() => {
    const checkRetroactiveAchievements = async () => {
      setIsCheckingAchievements(true)
      try {
        const response = await fetch('/api/gamification/retroactive-achievements', {
          method: 'POST'
        })
        const result = await response.json()
        if (result.success && result.data.achievements_unlocked > 0) {
          setAchievementsUnlocked(result.data.achievements_unlocked)
          // Refetch achievements after a short delay
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } catch (error) {
        console.error('Error checking retroactive achievements:', error)
      } finally {
        setIsCheckingAchievements(false)
      }
    }

    // Only check if we have achievements loaded (to avoid double-checking)
    if (!isLoading && achievements) {
      checkRetroactiveAchievements()
    }
  }, [isLoading, achievements])

  const unlockedAchievements = achievements || []
  const unlockedTypes = new Set(unlockedAchievements.map((a: Achievement) => a.achievement_type))

  // Group achievements by category
  const achievementsByCategory = Object.entries(ACHIEVEMENT_DEFINITIONS).reduce((acc, [type, def]) => {
    const category = def.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push({
      type,
      ...def,
      unlocked: unlockedTypes.has(type),
      unlockedAt: unlockedAchievements.find((a: Achievement) => a.achievement_type === type)?.unlocked_at
    })
    return acc
  }, {} as Record<string, any[]>)

  const categories = Object.keys(achievementsByCategory)
  const filteredAchievements = selectedCategory
    ? achievementsByCategory[selectedCategory]
    : Object.values(achievementsByCategory).flat()

  const totalAchievements = Object.keys(ACHIEVEMENT_DEFINITIONS).length
  const unlockedCount = unlockedAchievements.length
  const progressPercent = (unlockedCount / totalAchievements) * 100

  return (
    <div className="space-y-8">
      {/* Success Message */}
      {achievementsUnlocked !== null && achievementsUnlocked > 0 && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-emerald-200 font-medium">
              🎉 Unlocked {achievementsUnlocked} achievement{achievementsUnlocked !== 1 ? 's' : ''}!
            </p>
            <p className="text-emerald-300 text-sm">Your achievements have been updated based on your past actions.</p>
          </div>
        </div>
      )}

      {/* Checking Achievements Indicator */}
      {isCheckingAchievements && (
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-blue-400 animate-spin" />
          <p className="text-blue-200">Checking your past actions and unlocking achievements...</p>
        </div>
      )}

      {/* Header */}
      <div className="tier-themed-gradient text-white rounded-xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">🏆 Achievements</h1>
              <p className="text-white/90">Track your impact through predictions, fund votes, and contributions</p>
            </div>
            <div className="hidden md:block">
              <XPBadge variant="compact" />
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/80">Progress</span>
              <span className="text-sm font-semibold">{unlockedCount} / {totalAchievements}</span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <AnimatedCard className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                selectedCategory === category
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </AnimatedCard>

      {/* Achievements Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-700 rounded-xl h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((achievement, index) => {
            const categoryColor = CATEGORY_COLORS[achievement.category as keyof typeof CATEGORY_COLORS] || 'from-slate-500 to-slate-600'
            const rarityColor = RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS] || RARITY_COLORS.common

            return (
              <motion.div
                key={achievement.type}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <AnimatedCard
                  className={`p-6 border-2 ${rarityColor} ${
                    achievement.unlocked ? '' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${categoryColor} flex items-center justify-center text-3xl flex-shrink-0 ${
                      achievement.unlocked ? '' : 'grayscale'
                    }`}>
                      {achievement.unlocked ? achievement.icon : '🔒'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white">{achievement.name}</h3>
                        {achievement.unlocked && (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{achievement.description}</p>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <p className="text-xs text-slate-500">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      )}
                      {!achievement.unlocked && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </div>
                          {/* Progress indicator for locked achievements */}
                          {userStats && (
                            <div className="space-y-1">
                              {(achievement.type === 'VOTE_10' || achievement.type === 'VOTE_50') && (
                                <div className="text-xs">
                                  <div className="flex justify-between text-slate-500 mb-1">
                                    <span>Predictions</span>
                                    <span>{userStats.votes_cast || 0} / {achievement.type === 'VOTE_10' ? 10 : 50}</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-teal-500 transition-all"
                                      style={{ width: `${Math.min(((userStats.votes_cast || 0) / (achievement.type === 'VOTE_10' ? 10 : 50)) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {(achievement.type === 'FIRST_FUND_VOTE' || achievement.type === 'FUND_CHAMPION') && (
                                <div className="text-xs">
                                  <div className="flex justify-between text-slate-500 mb-1">
                                    <span>Fund vote cycles</span>
                                    <span>{userStats.fund_vote_cycles || 0} / {achievement.type === 'FUND_CHAMPION' ? 5 : 1}</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-teal-500 transition-all"
                                      style={{ width: `${Math.min(((userStats.fund_vote_cycles || 0) / (achievement.type === 'FUND_CHAMPION' ? 5 : 1)) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {(achievement.type === 'FIRST_CORRECT' || achievement.type === 'CORRECT_10') && (
                                <div className="text-xs">
                                  <div className="flex justify-between text-slate-500 mb-1">
                                    <span>Correct predictions</span>
                                    <span>{userStats.correct_predictions || 0} / {achievement.type === 'CORRECT_10' ? 10 : 1}</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-teal-500 transition-all"
                                      style={{ width: `${Math.min(((userStats.correct_predictions || 0) / (achievement.type === 'CORRECT_10' ? 10 : 1)) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {achievement.type === 'SPONSOR_10' && (
                                <div className="text-xs">
                                  <div className="flex justify-between text-slate-500 mb-1">
                                    <span>Sponsorships</span>
                                    <span>{userStats.sponsorships_made || 0} / 10</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-teal-500 transition-all"
                                      style={{ width: `${Math.min(((userStats.sponsorships_made || 0) / 10) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </AnimatedCard>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredAchievements.length === 0 && !isLoading && (
        <AnimatedCard className="p-12 text-center">
          <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">No achievements found</p>
          <p className="text-slate-500 text-sm mt-2">Try selecting a different category</p>
        </AnimatedCard>
      )}
    </div>
  )
}

