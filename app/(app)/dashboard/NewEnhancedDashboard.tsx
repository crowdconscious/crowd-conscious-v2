'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'
import ImpactDashboard from './ImpactDashboard'
import { XPProgressBar, AchievementsGrid, CommunityLeaderboard, WeeklyChallenge } from '@/components/GamificationSystem'
import DashboardCalendar from '../../components/DashboardCalendar'

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
  userCommunities: any[]
}

export default function NewEnhancedDashboard({ user, initialUserStats, userCommunities }: EnhancedDashboardProps) {
  const [userStats] = useState<UserStats | null>(initialUserStats)
  const [activeTab, setActiveTab] = useState<'overview' | 'impact' | 'gamification' | 'calendar'>('overview')

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
            <AnimatedCard 
              className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center cursor-pointer hover:bg-white/30 transition-all"
              onClick={() => setActiveTab('gamification')}
            >
              <div className="text-2xl font-bold">{userStats.level}</div>
              <div className="text-teal-100 text-sm">Level</div>
            </AnimatedCard>
            <AnimatedCard 
              className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center cursor-pointer hover:bg-white/30 transition-all"
              onClick={() => setActiveTab('gamification')}
            >
              <div className="text-2xl font-bold">{userStats.total_xp.toLocaleString()}</div>
              <div className="text-teal-100 text-sm">Total XP</div>
            </AnimatedCard>
            <AnimatedCard 
              className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center cursor-pointer hover:bg-white/30 transition-all"
              onClick={() => setActiveTab('gamification')}
            >
              <div className="text-2xl font-bold">{userStats.current_streak}</div>
              <div className="text-teal-100 text-sm">Day Streak</div>
            </AnimatedCard>
            <AnimatedCard 
              className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center cursor-pointer hover:bg-white/30 transition-all"
              onClick={() => setActiveTab('impact')}
            >
              <div className="text-2xl font-bold">{userStats.votes_cast}</div>
              <div className="text-teal-100 text-sm">Votes Cast</div>
            </AnimatedCard>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('impact')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'impact'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              🌍 Impact Dashboard
            </button>
            <button
              onClick={() => setActiveTab('gamification')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'gamification'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              🏆 Achievements & XP
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'calendar'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              📅 Calendar
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions Grid */}
              <div>
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
              </div>

              {/* Activity Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">📈 Your Activity</h3>
                  <div className="space-y-3">
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
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">🔥 Streak & Level</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-orange-800">Current Streak</span>
                        <span className="text-2xl font-bold text-orange-600">{userStats.current_streak} days</span>
                      </div>
                      <div className="text-sm text-orange-700">
                        Longest streak: {userStats.longest_streak} days
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-800">Current Level</span>
                        <span className="text-2xl font-bold text-purple-600">{userStats.level}</span>
                      </div>
                      <div className="text-sm text-purple-700">
                        {userStats.total_xp.toLocaleString()} total XP earned
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'impact' && (
            <ImpactDashboard userId={user.id} />
          )}

          {activeTab === 'gamification' && (
            <div className="space-y-8">
              <XPProgressBar userStats={userStats} />
              <WeeklyChallenge />
              <AchievementsGrid userStats={userStats} />
              <CommunityLeaderboard />
            </div>
          )}

          {activeTab === 'calendar' && (
            <DashboardCalendar userId={user.id} />
          )}
        </div>
      </div>
    </div>
  )
}
