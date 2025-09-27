'use client'

import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { 
  XPProgressBar, 
  AchievementsGrid, 
  CommunityLeaderboard, 
  WeeklyChallenge 
} from '@/components/GamificationSystem'
import { 
  AnimatedCard, 
  AnimatedButton, 
  DashboardSectionSkeleton,
  EmptyState,
  usePullToRefresh 
} from '@/components/ui/UIComponents'

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

interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  href: string
  badge?: string
  color: string
}

interface RecentActivity {
  id: string
  type: 'vote' | 'content' | 'comment' | 'achievement'
  title: string
  description: string
  xp_earned: number
  timestamp: string
  related_url?: string
}

export default function DashboardClient({ 
  user, 
  initialUserStats 
}: {
  user: any
  initialUserStats: UserStats | null
}) {
  const [userStats, setUserStats] = useState<UserStats | null>(initialUserStats)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [quickActions, setQuickActions] = useState<QuickAction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Fetch or create user stats
      let { data: statsData, error: statsError } = await supabaseClient
        .from('user_stats')
        .select('*')
        .eq('user_id', (user as any).id)
        .single()

      if (statsError && statsError.code === 'PGRST116') {
        // Create initial user stats
        // TODO: Create initial user stats - temporarily disabled for deployment
        console.log('Creating user stats for:', (user as any).id)
        const newStats = {
          user_id: (user as any).id,
          total_xp: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          achievements_unlocked: []
        }
        statsData = newStats as any
      }

      if (statsData) {
        setUserStats(statsData)
      }

      // Fetch recent XP transactions
      const { data: activityData } = await supabaseClient
        .from('xp_transactions')
        .select('*')
        .eq('user_id', (user as any).id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (activityData) {
        const formattedActivity: RecentActivity[] = activityData.map((tx: any) => ({
          id: tx.id,
          type: tx.action_type?.includes('vote') ? 'vote' :
                tx.action_type?.includes('content') ? 'content' :
                tx.action_type?.includes('comment') ? 'comment' : 'achievement',
          title: formatActivityTitle(tx.action_type),
          description: tx.description || formatActivityDescription(tx.action_type),
          xp_earned: tx.xp_amount,
          timestamp: tx.created_at
        }))
        setRecentActivity(formattedActivity)
      }

      // Generate contextual quick actions
      generateQuickActions(statsData)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateQuickActions = (stats: UserStats | null) => {
    const actions: QuickAction[] = [
      {
        id: 'browse_communities',
        title: 'Explore Communities',
        description: 'Discover local groups making impact',
        icon: '🌍',
        href: '/communities',
        color: 'from-blue-500 to-cyan-500'
      },
      {
        id: 'create_content',
        title: 'Share an Idea',
        description: 'Post a need, event, or poll',
        icon: '💡',
        href: '/communities',
        badge: '+25 XP',
        color: 'from-green-500 to-emerald-500'
      },
      {
        id: 'discover',
        title: 'Discover Trending',
        description: 'See what\'s popular this week',
        icon: '🔥',
        href: '/discover',
        color: 'from-orange-500 to-red-500'
      }
    ]

    // Add contextual actions based on user progress
    if (stats) {
      if (stats.votes_cast === 0) {
        actions.unshift({
          id: 'first_vote',
          title: 'Cast Your First Vote',
          description: 'Participate in community decisions',
          icon: '🗳️',
          href: '/communities',
          badge: '+5 XP + Achievement',
          color: 'from-purple-500 to-pink-500'
        })
      }

      if (stats.content_created === 0) {
        actions.push({
          id: 'first_content',
          title: 'Create First Content',
          description: 'Share your community idea',
          icon: '✨',
          href: '/communities',
          badge: '+25 XP + Achievement',
          color: 'from-indigo-500 to-purple-500'
        })
      }

      if (stats.current_streak < 3) {
        actions.push({
          id: 'build_streak',
          title: 'Build Your Streak',
          description: `${3 - stats.current_streak} more days for achievement`,
          icon: '🔥',
          href: '/communities',
          badge: `${stats.current_streak}/3 days`,
          color: 'from-yellow-500 to-orange-500'
        })
      }
    }

    setQuickActions(actions.slice(0, 6)) // Max 6 actions
  }

  const formatActivityTitle = (actionType: string): string => {
    const titles: Record<string, string> = {
      'vote_cast': 'Voted on Content',
      'content_created': 'Created Content',
      'content_approved': 'Content Approved',
      'comment_posted': 'Posted Comment',
      'achievement_unlocked': 'Achievement Unlocked',
      'streak_bonus': 'Streak Bonus',
      'daily_login': 'Daily Login'
    }
    return titles[actionType] || 'Activity'
  }

  const formatActivityDescription = (actionType: string): string => {
    const descriptions: Record<string, string> = {
      'vote_cast': 'Participated in community decision',
      'content_created': 'Shared idea with community',
      'comment_posted': 'Joined the discussion',
      'achievement_unlocked': 'Unlocked new achievement',
      'streak_bonus': 'Maintained daily activity',
      'daily_login': 'Started the day with engagement'
    }
    return descriptions[actionType] || 'Earned XP'
  }

  const getActivityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'vote': '🗳️',
      'content': '💡',
      'comment': '💬',
      'achievement': '🏆'
    }
    return icons[type] || '⭐'
  }

  const getTimeOfDayMessage = (): string => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const handleRefresh = async () => {
    await fetchDashboardData()
  }

  const isRefreshing = usePullToRefresh(handleRefresh)

  useEffect(() => {
    fetchDashboardData()
  }, [(user as any).id])

  if (!userStats && isLoading) {
    return (
      <div className="space-y-8">
        <DashboardSectionSkeleton />
        <DashboardSectionSkeleton />
        <DashboardSectionSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-teal-500 text-white px-4 py-2 rounded-full text-sm font-medium">
          Refreshing...
        </div>
      )}

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

          {userStats && (
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
          )}
        </div>
      </div>

      {/* XP Progress Bar */}
      {userStats && (
        <XPProgressBar userStats={userStats} />
      )}

      {/* Weekly Challenge */}
      <WeeklyChallenge />

      {/* Quick Actions Grid */}
      <AnimatedCard>
        <h2 className="text-xl font-semibold text-slate-900 mb-6">⚡ Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.id} href={action.href}>
              <AnimatedCard className={`
                h-full p-6 bg-gradient-to-br ${action.color} text-white relative overflow-hidden
                hover:scale-105 transition-all duration-300 cursor-pointer
              `}>
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <AnimatedCard>
          <h2 className="text-xl font-semibold text-slate-900 mb-6">📈 Recent Activity</h2>
          
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm">{activity.title}</div>
                    <div className="text-slate-600 text-xs">{activity.description}</div>
                    <div className="text-slate-500 text-xs">
                      {new Date(activity.timestamp).toLocaleDateString()} at{' '}
                      {new Date(activity.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-teal-600 font-semibold text-sm">+{activity.xp_earned} XP</div>
                  </div>
                </div>
              ))}
              
              {recentActivity.length > 8 && (
                <div className="text-center pt-2">
                  <AnimatedButton variant="ghost" size="sm">
                    View All Activity
                  </AnimatedButton>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon="📈"
              title="No Activity Yet"
              description="Start engaging with communities to see your activity here!"
              action={{
                label: "Explore Communities",
                onClick: () => window.location.href = '/communities'
              }}
            />
          )}
        </AnimatedCard>

        {/* Community Leaderboard */}
        <CommunityLeaderboard />
      </div>

      {/* Achievements Section */}
      {userStats && (
        <AnimatedCard>
          <h2 className="text-xl font-semibold text-slate-900 mb-6">🏆 Your Achievements</h2>
          <AchievementsGrid userStats={userStats} />
        </AnimatedCard>
      )}

      {/* Impact Visualization Placeholder */}
      <AnimatedCard>
        <h2 className="text-xl font-semibold text-slate-900 mb-6">📊 Your Impact (Coming Soon)</h2>
        <DashboardSectionSkeleton />
        <div className="text-center mt-4 text-slate-500">
          Detailed impact metrics and visualizations will be available soon!
        </div>
      </AnimatedCard>
    </div>
  )
}
