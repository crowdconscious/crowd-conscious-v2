'use client'

import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'
// Note: addToast will be available from ToastProvider context

interface UserStats {
  id: string
  user_id: string
  total_xp: number
  level: number
  current_streak: number
  longest_streak: number
  last_activity: string
  votes_cast: number
  content_created: number
  events_attended: number
  achievements_unlocked: string[]
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'engagement' | 'creation' | 'social' | 'milestone'
  points_required?: number
  condition_type: 'xp_total' | 'votes_cast' | 'content_created' | 'streak_days' | 'events_attended'
  condition_value: number
  badge_color: string
}

// XP Points system
export const XP_REWARDS = {
  vote_cast: 5,
  content_created: 25,
  content_approved: 50,
  event_rsvp: 10,
  event_attended: 30,
  comment_posted: 3,
  reaction_given: 1,
  daily_login: 10,
  streak_bonus: 5, // multiplied by streak count
  achievement_unlocked: 100
}

// Calculate level from XP
const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

// Calculate XP needed for next level
const getXPForNextLevel = (currentLevel: number): number => {
  return Math.pow(currentLevel, 2) * 100
}

// Available achievements
const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_vote',
    name: 'Democracy Starter',
    description: 'Cast your first vote',
    icon: '🗳️',
    category: 'engagement',
    condition_type: 'votes_cast',
    condition_value: 1,
    badge_color: 'bg-blue-100 text-blue-700'
  },
  {
    id: 'vote_champion',
    name: 'Vote Champion',
    description: 'Cast 50 votes',
    icon: '🏆',
    category: 'engagement',
    condition_type: 'votes_cast',
    condition_value: 50,
    badge_color: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'content_creator',
    name: 'Content Creator',
    description: 'Create your first content',
    icon: '✨',
    category: 'creation',
    condition_type: 'content_created',
    condition_value: 1,
    badge_color: 'bg-green-100 text-green-700'
  },
  {
    id: 'prolific_creator',
    name: 'Prolific Creator',
    description: 'Create 10 pieces of content',
    icon: '🚀',
    category: 'creation',
    condition_type: 'content_created',
    condition_value: 10,
    badge_color: 'bg-yellow-100 text-yellow-700'
  },
  {
    id: 'streak_3',
    name: 'Consistent',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    category: 'engagement',
    condition_type: 'streak_days',
    condition_value: 3,
    badge_color: 'bg-orange-100 text-orange-700'
  },
  {
    id: 'streak_7',
    name: 'Dedicated',
    description: 'Maintain a 7-day streak',
    icon: '💪',
    category: 'engagement',
    condition_type: 'streak_days',
    condition_value: 7,
    badge_color: 'bg-red-100 text-red-700'
  },
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    category: 'milestone',
    condition_type: 'xp_total',
    condition_value: 2500, // Level 5 = 25^2 * 100 = 2500 XP
    badge_color: 'bg-indigo-100 text-indigo-700'
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Attend 5 events',
    icon: '🦋',
    category: 'social',
    condition_type: 'events_attended',
    condition_value: 5,
    badge_color: 'bg-pink-100 text-pink-700'
  }
]

// XP Progress Bar Component
export function XPProgressBar({ userStats }: { userStats: UserStats }) {
  const currentLevel = userStats.level
  const currentXP = userStats.total_xp
  const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100
  const nextLevelXP = Math.pow(currentLevel, 2) * 100
  const progressXP = currentXP - currentLevelXP
  const requiredXP = nextLevelXP - currentLevelXP
  const progressPercent = (progressXP / requiredXP) * 100

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Level {currentLevel}</h3>
          <p className="text-slate-600 text-sm">{currentXP.toLocaleString()} total XP</p>
        </div>
        <div className="text-right">
          <div className="text-2xl mb-1">
            {currentLevel < 5 ? '🌱' : currentLevel < 10 ? '🌿' : currentLevel < 20 ? '🌳' : '🏆'}
          </div>
          <div className="text-xs text-slate-500">
            {progressXP}/{requiredXP} XP
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>Level {currentLevel}</span>
          <span>Level {currentLevel + 1}</span>
        </div>
      </div>

      {/* Streak Counter */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <div>
            <div className="font-medium text-slate-900">{userStats.current_streak} day streak</div>
            <div className="text-xs text-slate-500">Longest: {userStats.longest_streak} days</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-teal-600">+{userStats.current_streak * XP_REWARDS.streak_bonus} XP</div>
          <div className="text-xs text-slate-500">Streak bonus</div>
        </div>
      </div>
    </div>
  )
}

// Achievement Badge Component
export function AchievementBadge({ achievement, unlocked, progress }: {
  achievement: Achievement
  unlocked: boolean
  progress?: number
}) {
  const progressPercent = progress ? (progress / achievement.condition_value) * 100 : 0

  return (
    <div className={`
      p-4 rounded-xl border-2 transition-all duration-300
      ${unlocked 
        ? `${achievement.badge_color} border-current shadow-md` 
        : 'bg-slate-50 text-slate-400 border-slate-200'
      }
    `}>
      <div className="text-center">
        <div className={`text-3xl mb-2 ${unlocked ? '' : 'grayscale'}`}>
          {achievement.icon}
        </div>
        <h4 className={`font-semibold text-sm mb-1 ${unlocked ? '' : 'text-slate-500'}`}>
          {achievement.name}
        </h4>
        <p className="text-xs leading-tight mb-3">
          {achievement.description}
        </p>

        {/* Progress Bar for Locked Achievements */}
        {!unlocked && progress !== undefined && (
          <div className="space-y-1">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-400 to-purple-400 transition-all duration-300"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-500">
              {progress}/{achievement.condition_value}
            </div>
          </div>
        )}

        {unlocked && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/50 rounded-full text-xs font-medium">
            ✓ Unlocked
          </div>
        )}
      </div>
    </div>
  )
}

// Achievements Grid Component
export function AchievementsGrid({ userStats }: { userStats: UserStats }) {
  const getAchievementProgress = (achievement: Achievement): number => {
    switch (achievement.condition_type) {
      case 'xp_total':
        return userStats.total_xp
      case 'votes_cast':
        return userStats.votes_cast
      case 'content_created':
        return userStats.content_created
      case 'streak_days':
        return userStats.current_streak
      case 'events_attended':
        return userStats.events_attended
      default:
        return 0
    }
  }

  const isAchievementUnlocked = (achievement: Achievement): boolean => {
    return userStats.achievements_unlocked.includes(achievement.id)
  }

  const achievementsByCategory = ACHIEVEMENTS.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = []
    }
    acc[achievement.category].push(achievement)
    return acc
  }, {} as Record<string, Achievement[]>)

  const categoryIcons = {
    engagement: '🎯',
    creation: '✨',
    social: '👥',
    milestone: '🏆'
  }

  const categoryNames = {
    engagement: 'Engagement',
    creation: 'Creation',
    social: 'Social',
    milestone: 'Milestones'
  }

  return (
    <div className="space-y-8">
      {Object.entries(achievementsByCategory).map(([category, achievements]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{categoryIcons[category as keyof typeof categoryIcons]}</span>
            <h3 className="text-xl font-semibold text-slate-900">
              {categoryNames[category as keyof typeof categoryNames]}
            </h3>
            <div className="text-sm text-slate-500">
              {achievements.filter(a => isAchievementUnlocked(a)).length}/{achievements.length}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {achievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                unlocked={isAchievementUnlocked(achievement)}
                progress={getAchievementProgress(achievement)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Leaderboard Component
export function CommunityLeaderboard({ communityId }: { communityId?: string }) {
  const [leaderboard, setLeaderboard] = useState<(UserStats & { user: { full_name: string; email: string } })[]>([])
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [timeframe, communityId])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      let query = supabaseClient
        .from('user_stats')
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .order('total_xp', { ascending: false })
        .limit(10)

      // Add time-based filtering if needed
      if (timeframe === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('last_activity', weekAgo)
      } else if (timeframe === 'month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('last_activity', monthAgo)
      }

      const { data, error } = await query

      if (!error && data) {
        setLeaderboard(data)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
              <div className="h-6 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">🏆 Leaderboard</h3>
        
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['week', 'month', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeframe === period
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {leaderboard.map((userStat, index) => (
          <div
            key={userStat.user_id}
            className={`
              flex items-center gap-3 p-3 rounded-lg transition-colors
              ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 'bg-slate-50'}
            `}
          >
            {/* Rank */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
              ${index === 0 ? 'bg-yellow-500 text-white' :
                index === 1 ? 'bg-gray-400 text-white' :
                index === 2 ? 'bg-orange-600 text-white' :
                'bg-slate-200 text-slate-600'}
            `}>
              {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 truncate">
                {userStat.user.full_name || userStat.user.email}
              </div>
              <div className="text-sm text-slate-500">
                Level {userStat.level} • {userStat.current_streak} day streak
              </div>
            </div>

            {/* XP */}
            <div className="text-right">
              <div className="font-semibold text-slate-900">
                {userStat.total_xp.toLocaleString()} XP
              </div>
              <div className="text-xs text-slate-500">
                {userStat.achievements_unlocked.length} achievements
              </div>
            </div>
          </div>
        ))}

        {leaderboard.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-slate-600">No activity in this timeframe</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Weekly Challenge Component
export function WeeklyChallenge() {
  const [currentChallenge, setCurrentChallenge] = useState({
    id: 'weekly_voter',
    title: 'Democracy Week',
    description: 'Cast 10 votes this week to earn bonus XP',
    icon: '🗳️',
    progress: 3,
    target: 10,
    reward_xp: 200,
    ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) // 4 days from now
  })

  const progressPercent = (currentChallenge.progress / currentChallenge.target) * 100
  const isCompleted = currentChallenge.progress >= currentChallenge.target
  const daysLeft = Math.ceil((currentChallenge.ends_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className={`
      rounded-xl border-2 transition-all duration-300 p-6
      ${isCompleted 
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
        : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
      }
    `}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{currentChallenge.icon}</div>
          <div>
            <h3 className="font-semibold text-slate-900">{currentChallenge.title}</h3>
            <p className="text-slate-600 text-sm">{currentChallenge.description}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${isCompleted ? 'bg-green-200 text-green-800' : 'bg-purple-200 text-purple-800'}
          `}>
            {isCompleted ? 'Completed!' : `${daysLeft} days left`}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Progress</span>
          <span className="font-medium text-slate-900">
            {currentChallenge.progress}/{currentChallenge.target}
          </span>
        </div>
        
        <div className="h-3 bg-white/50 rounded-full overflow-hidden">
          <div 
            className={`
              h-full transition-all duration-500 ease-out
              ${isCompleted 
                ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                : 'bg-gradient-to-r from-purple-400 to-indigo-500'
              }
            `}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Reward */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>🎁</span>
          <span>Reward: {currentChallenge.reward_xp} XP</span>
        </div>
        
        {isCompleted && (
          <AnimatedButton
            onClick={() => {
              // Challenge completed logic
              alert('Challenge completed! You earned ' + currentChallenge.reward_xp + ' XP!')
            }}
            variant="primary"
            size="sm"
          >
            Claim Reward
          </AnimatedButton>
        )}
      </div>
    </div>
  )
}
