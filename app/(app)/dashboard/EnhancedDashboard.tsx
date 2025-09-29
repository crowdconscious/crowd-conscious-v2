'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'
import ImpactDashboard from './ImpactDashboard'
import { XPProgressBar, AchievementsGrid, CommunityLeaderboard, WeeklyChallenge } from '@/components/GamificationSystem'

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
  comments_posted: number
  achievements_unlocked: string[]
}

interface EnhancedDashboardProps {
  user: any
  initialUserStats: UserStats | null
}

// Simple XP Progress Component
function XPProgressDisplay({ userStats }: { userStats: UserStats }) {
  const currentLevel = userStats.level
  const currentXP = userStats.total_xp
  const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100
  const nextLevelXP = Math.pow(currentLevel, 2) * 100
  const progressXP = currentXP - currentLevelXP
  const requiredXP = nextLevelXP - currentLevelXP
  const progressPercent = (progressXP / requiredXP) * 100

  return (
    <AnimatedCard className="p-6">
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
          <div className="text-sm font-medium text-teal-600">+{userStats.current_streak * 5} XP</div>
          <div className="text-xs text-slate-500">Streak bonus</div>
        </div>
      </div>
    </AnimatedCard>
  )
}

// Simple Achievements Display
function AchievementsDisplay({ userStats }: { userStats: UserStats }) {
  const achievements = [
    { id: 'first_vote', name: 'Democracy Starter', icon: '🗳️', description: 'Cast your first vote' },
    { id: 'content_creator', name: 'Content Creator', icon: '✨', description: 'Create your first content' },
    { id: 'streak_3', name: 'Consistent', icon: '🔥', description: 'Maintain a 3-day streak' },
    { id: 'level_5', name: 'Rising Star', icon: '⭐', description: 'Reach level 5' },
  ]

  return (
    <AnimatedCard className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        🏆 Achievements ({userStats.achievements_unlocked.length}/{achievements.length})
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {achievements.map((achievement) => {
          const unlocked = userStats.achievements_unlocked.includes(achievement.id)
          return (
            <div
              key={achievement.id}
              className={`
                p-3 rounded-lg border-2 text-center transition-all
                ${unlocked 
                  ? 'bg-teal-50 border-teal-200 text-teal-700' 
                  : 'bg-slate-50 border-slate-200 text-slate-400'
                }
              `}
            >
              <div className={`text-2xl mb-1 ${unlocked ? '' : 'grayscale'}`}>
                {achievement.icon}
              </div>
              <div className="text-xs font-medium">{achievement.name}</div>
              <div className="text-xs opacity-80">{achievement.description}</div>
            </div>
          )
        })}
      </div>
    </AnimatedCard>
  )
}

// Weekly Challenge Component
function WeeklyChallengeDisplay() {
  const challenge = {
    title: 'Democracy Week',
    description: 'Cast 10 votes this week to earn bonus XP',
    icon: '🗳️',
    progress: 0, // Will be updated with real user progress
    target: 10,
    reward_xp: 200
  }

  const progressPercent = (challenge.progress / challenge.target) * 100
  const isCompleted = challenge.progress >= challenge.target

  return (
    <AnimatedCard className={`p-6 ${isCompleted ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{challenge.icon}</div>
          <div>
            <h3 className="font-semibold text-slate-900">{challenge.title}</h3>
            <p className="text-slate-600 text-sm">{challenge.description}</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${isCompleted ? 'bg-green-200 text-green-800' : 'bg-purple-200 text-purple-800'}`}>
          {isCompleted ? 'Completed!' : '4 days left'}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Progress</span>
          <span className="font-medium text-slate-900">{challenge.progress}/{challenge.target}</span>
        </div>
        
        <div className="h-3 bg-white/50 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${isCompleted ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-purple-400 to-indigo-500'}`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Reward */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>🎁</span>
          <span>Reward: {challenge.reward_xp} XP</span>
        </div>
        
        {isCompleted && (
          <AnimatedButton
            onClick={() => alert(`Challenge completed! You earned ${challenge.reward_xp} XP!`)}
            size="sm"
          >
            Claim Reward
          </AnimatedButton>
        )}
      </div>
    </AnimatedCard>
  )
}

export default function EnhancedDashboard({ user, initialUserStats }: EnhancedDashboardProps) {
  const [userStats] = useState<UserStats | null>(initialUserStats)
  const [activeTab, setActiveTab] = useState<'overview' | 'impact' | 'gamification'>('overview')

  const getTimeOfDayMessage = (): string => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (!userStats) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-xl p-8">
          <h1 className="text-4xl font-bold mb-4">
            {getTimeOfDayMessage()}, {user.full_name || user.email?.split('@')[0] || 'Changemaker'}! 👋
          </h1>
          <p className="text-xl text-teal-100">Loading your stats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-purple-700 text-white rounded-xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {getTimeOfDayMessage()}, {user.full_name || user.email?.split('@')[0] || 'Changemaker'}! 👋
          </h1>
          <p className="text-teal-100 text-lg mb-6">
            Ready to make an impact in your community today?
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{userStats.level}</div>
              <div className="text-teal-100 text-sm">Level</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{userStats.total_xp.toLocaleString()}</div>
              <div className="text-teal-100 text-sm">Total XP</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{userStats.current_streak}</div>
              <div className="text-teal-100 text-sm">Day Streak</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{userStats.achievements_unlocked.length}</div>
              <div className="text-teal-100 text-sm">Achievements</div>
            </div>
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <XPProgressDisplay userStats={userStats} />

      {/* Weekly Challenge */}
      <WeeklyChallengeDisplay />

      {/* Quick Actions Grid */}
      <AnimatedCard className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">⚡ Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Browse Communities',
              description: 'Discover local groups making impact',
              icon: '🌍',
              href: '/communities',
              color: 'from-blue-500 to-cyan-500'
            },
            {
              title: 'Share an Idea',
              description: 'Post a need, event, or poll',
              icon: '💡',
              href: '/communities',
              badge: '+25 XP',
              color: 'from-green-500 to-emerald-500'
            },
            {
              title: 'Discover Trending',
              description: "See what's popular this week",
              icon: '🔥',
              href: '/discover',
              color: 'from-orange-500 to-red-500'
            }
          ].map((action) => (
            <Link key={action.title} href={action.href}>
              <AnimatedCard className={`h-full p-6 bg-gradient-to-br ${action.color} text-white relative overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer`}>
                <div className="absolute top-2 right-2 text-3xl opacity-20">
                  {action.icon}
                </div>
                <div className="relative z-10">
                  <div className="text-2xl mb-2">{action.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{action.title}</h3>
                  <p className="text-white/90 text-sm mb-3">{action.description}</p>
                  {action.badge && (
                    <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                      {action.badge}
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </Link>
          ))}
        </div>
      </AnimatedCard>

      {/* Achievements */}
      <AchievementsDisplay userStats={userStats} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnimatedCard className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">📈 Your Activity</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗳️</span>
                <span className="font-medium">Votes Cast</span>
              </div>
              <span className="text-2xl font-bold text-teal-600">{userStats.votes_cast}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💡</span>
                <span className="font-medium">Content Created</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">{userStats.content_created}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <span className="font-medium">Comments Posted</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{userStats.comments_posted}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎪</span>
                <span className="font-medium">Events Attended</span>
              </div>
              <span className="text-2xl font-bold text-orange-600">{userStats.events_attended}</span>
            </div>
          </div>
        </AnimatedCard>

        {/* Getting Started */}
        <AnimatedCard className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">🚀 Next Steps</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl">🌍</div>
              <div>
                <h4 className="font-medium text-slate-900">Join More Communities</h4>
                <p className="text-sm text-slate-600">Find local groups working on causes you care about</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl">🗳️</div>
              <div>
                <h4 className="font-medium text-slate-900">Vote on Proposals</h4>
                <p className="text-sm text-slate-600">Help communities decide on important initiatives</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl">💡</div>
              <div>
                <h4 className="font-medium text-slate-900">Share Your Ideas</h4>
                <p className="text-sm text-slate-600">Propose needs, events, and challenges</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl">🏆</div>
              <div>
                <h4 className="font-medium text-slate-900">Unlock Achievements</h4>
                <p className="text-sm text-slate-600">Complete challenges and earn recognition</p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}