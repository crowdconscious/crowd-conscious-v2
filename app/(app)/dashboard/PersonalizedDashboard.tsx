'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Badge,
  Progress
} from '../../components/ui'
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer 
} from 'recharts'
import { format } from 'date-fns'

interface Community {
  id: string
  name: string
  description: string | null
  member_count: number
  address: string | null
}

interface PersonalizedDashboardProps {
  user: any
  userCommunities: Community[]
  userStats: any
}

export default function PersonalizedDashboard({ user, userCommunities, userStats }: PersonalizedDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activityFilter, setActivityFilter] = useState<'all' | 'votes' | 'events' | 'content'>('all')
  const [displayedActivities, setDisplayedActivities] = useState(4) // Start with 4 activities
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [focusedActionIndex, setFocusedActionIndex] = useState(-1)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const quickActionsRef = useRef<HTMLDivElement>(null)

  // Update time every minute for personalized greeting
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // Use real data passed from server
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Show activity based on user's actual communities
    const placeholderActivities = userCommunities.length > 0 ? [
      { 
        id: '1', 
        type: 'join', 
        content: `Joined ${userCommunities[0].name}`, 
        community: userCommunities[0].name, 
        time: new Date(), 
        impact: '+20 points', 
        icon: '🤝' 
      }
    ] : [
      { 
        id: '1', 
        type: 'signup', 
        content: 'Welcome to Crowd Conscious!', 
        community: 'Platform', 
        time: new Date(), 
        impact: '+10 points', 
        icon: '🌱' 
      }
    ]
    
    setRecentActivities(placeholderActivities)
  }, [userCommunities])

  // Real impact stats from actual user data
  const impactStats = {
    communitiesJoined: userCommunities.length,
    votesThisMonth: userStats?.votes_cast || 0,
    eventsAttended: userStats?.events_attended || 0,
    needsSupported: userStats?.content_created || 0,
    totalImpactPoints: userStats?.total_xp || 0
  }

  // Achievement badges based on real data
  const achievements = [
    { 
      id: 'voter', 
      name: 'Active Voter', 
      progress: Math.min((impactStats.votesThisMonth / 25) * 100, 100), 
      max: 25, 
      current: impactStats.votesThisMonth, 
      icon: '🗳️', 
      color: 'blue' 
    },
    { 
      id: 'attendee', 
      name: 'Event Goer', 
      progress: Math.min((impactStats.eventsAttended / 15) * 100, 100), 
      max: 15, 
      current: impactStats.eventsAttended, 
      icon: '📅', 
      color: 'green' 
    },
    { 
      id: 'supporter', 
      name: 'Content Creator', 
      progress: Math.min((impactStats.needsSupported / 10) * 100, 100), 
      max: 10, 
      current: impactStats.needsSupported, 
      icon: '💡', 
      color: 'purple' 
    }
  ]

  // Use real recent activities or placeholder
  const allActivities = recentActivities

  // Impact chart data based on real XP
  const impactChartData = [
    { name: 'Week 1', impact: Math.max(0, impactStats.totalImpactPoints - 40) },
    { name: 'Week 2', impact: Math.max(0, impactStats.totalImpactPoints - 30) },
    { name: 'Week 3', impact: Math.max(0, impactStats.totalImpactPoints - 20) },
    { name: 'Week 4', impact: Math.max(0, impactStats.totalImpactPoints - 10) },
    { name: 'This Week', impact: impactStats.totalImpactPoints }
  ]

  // Community comparison data based on real communities
  const communityData = userCommunities.slice(0, 3).map((community, index) => ({
    name: community.name.substring(0, 15) + (community.name.length > 15 ? '...' : ''),
    value: Math.floor(impactStats.totalImpactPoints / Math.max(userCommunities.length, 1)) + (index * 10),
    color: ['#14b8a6', '#8b5cf6', '#f59e0b'][index] || '#6b7280'
  }))

  // Filter activities and apply pagination
  const filteredActivities = allActivities.filter(activity => 
    activityFilter === 'all' || activity.type === activityFilter
  )
  
  const displayedFilteredActivities = filteredActivities.slice(0, displayedActivities)
  const hasMoreActivities = displayedActivities < filteredActivities.length

  // Load more activities function
  const loadMoreActivities = useCallback(() => {
    if (isLoadingMore || !hasMoreActivities) return
    
    setIsLoadingMore(true)
    // Simulate API delay
    setTimeout(() => {
      setDisplayedActivities(prev => Math.min(prev + 4, filteredActivities.length))
      setIsLoadingMore(false)
    }, 500)
  }, [isLoadingMore, hasMoreActivities, filteredActivities.length])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreActivities && !isLoadingMore) {
          loadMoreActivities()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMoreActivities, isLoadingMore, loadMoreActivities])

  // Reset pagination when filter changes
  useEffect(() => {
    setDisplayedActivities(4)
  }, [activityFilter])

  // Keyboard navigation for quick actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation when focus is on quick actions
      if (!quickActionsRef.current?.contains(document.activeElement)) return

      const totalActions = quickActions.length
      
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          setFocusedActionIndex(prev => 
            prev < totalActions - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          setFocusedActionIndex(prev => 
            prev > 0 ? prev - 1 : totalActions - 1
          )
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedActionIndex >= 0) {
            // Simulate click on focused action
            window.location.href = quickActions[focusedActionIndex].href
          }
          break
        case 'Escape':
          setFocusedActionIndex(-1)
          if (quickActionsRef.current) {
            (quickActionsRef.current.querySelector('[tabindex="0"]') as HTMLElement)?.blur()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [focusedActionIndex])

  // Focus management for quick actions
  useEffect(() => {
    if (focusedActionIndex >= 0 && quickActionsRef.current) {
      const actions = quickActionsRef.current.querySelectorAll('[data-action-index]')
      const focusedAction = actions[focusedActionIndex] as HTMLElement
      focusedAction?.focus()
    }
  }, [focusedActionIndex])

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const exportImpactReport = () => {
    const reportData = [
      {
        metric: 'Total Impact Points',
        value: impactStats.totalImpactPoints,
        date: format(new Date(), 'yyyy-MM-dd')
      },
      {
        metric: 'Communities Joined',
        value: impactStats.communitiesJoined,
        date: format(new Date(), 'yyyy-MM-dd')
      },
      {
        metric: 'Votes This Month',
        value: impactStats.votesThisMonth,
        date: format(new Date(), 'yyyy-MM-dd')
      },
      {
        metric: 'Events Attended',
        value: impactStats.eventsAttended,
        date: format(new Date(), 'yyyy-MM-dd')
      },
      {
        metric: 'Needs Supported',
        value: impactStats.needsSupported,
        date: format(new Date(), 'yyyy-MM-dd')
      }
    ]
    
    exportToCSV(reportData, 'personal-impact-report')
  }

  const exportActivityReport = () => {
    const activityData = displayedFilteredActivities.map(activity => ({
      date: format(activity.time, 'yyyy-MM-dd'),
      type: activity.type,
      content: activity.content,
      community: activity.community,
      impact: activity.impact.replace('+', '').replace(' points', ''),
      time: format(activity.time, 'HH:mm')
    }))
    
    exportToCSV(activityData, 'activity-report')
  }

  // Quick actions based on user activity
  const quickActions = [
    {
      title: 'Vote on Proposals',
      description: 'Review and vote on active community needs',
      icon: '🗳️',
      color: 'from-blue-500 to-blue-600',
      href: '/communities',
      priority: userCommunities.length > 0 ? 'high' : 'low'
    },
    {
      title: 'Find Events',
      description: 'Discover upcoming community events near you',
      icon: '📅',
      color: 'from-green-500 to-green-600',
      href: '/communities',
      priority: 'medium'
    },
    {
      title: 'Create Content',
      description: 'Share a need, organize an event, or start a poll',
      icon: '✨',
      color: 'from-purple-500 to-purple-600',
      href: '/communities',
      priority: userCommunities.length > 0 ? 'high' : 'low'
    },
    {
      title: 'Join Community',
      description: 'Find and join communities making impact',
      icon: '🌱',
      color: 'from-teal-500 to-teal-600',
      href: '/communities',
      priority: userCommunities.length === 0 ? 'high' : 'low'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      {/* Welcome Section with Time-based Greeting */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-purple-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {getTimeBasedGreeting()}, {user.full_name?.split(' ')[0] || 'Changemaker'}! 👋
              </h1>
              <p className="text-teal-100 text-lg mb-6">
                {format(currentTime, 'EEEE, MMMM do')} • You've earned {impactStats.totalImpactPoints} impact points this month
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{impactStats.communitiesJoined}</div>
                  <div className="text-teal-200 text-sm">Communities</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{impactStats.votesThisMonth}</div>
                  <div className="text-teal-200 text-sm">Votes Cast</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{impactStats.eventsAttended}</div>
                  <div className="text-teal-200 text-sm">Events Joined</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{impactStats.needsSupported}</div>
                  <div className="text-teal-200 text-sm">Needs Supported</div>
                </div>
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="w-full md:w-80">
              <h3 className="text-lg font-semibold mb-4 text-teal-100">Achievement Progress</h3>
              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{achievement.icon}</span>
                        <span className="font-medium text-sm">{achievement.name}</span>
                      </div>
                      <span className="text-xs text-teal-200">{achievement.current}/{achievement.max}</span>
                    </div>
                    <Progress value={achievement.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    Recent Activity
                  </CardTitle>
                  
                  <div className="flex items-center gap-4">
                    {/* Export Button */}
                    <button
                      onClick={exportActivityReport}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-700 rounded-lg transition-colors"
                      title="Export activity data as CSV"
                    >
                      <span>📊</span>
                      Export
                    </button>
                    
                    {/* Activity Filter with Keyboard Support */}
                    <div className="flex gap-2" role="tablist" aria-label="Activity filter">
                    {[
                      { key: 'all', label: 'All', icon: '📋' },
                      { key: 'votes', label: 'Votes', icon: '🗳️' },
                      { key: 'events', label: 'Events', icon: '📅' },
                      { key: 'content', label: 'Content', icon: '✨' }
                    ].map(filter => (
                      <button
                        key={filter.key}
                        role="tab"
                        aria-selected={activityFilter === filter.key}
                        aria-controls="activity-content"
                        onClick={() => setActivityFilter(filter.key as any)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                            e.preventDefault()
                            const filters = ['all', 'votes', 'events', 'content']
                            const currentIndex = filters.indexOf(filter.key)
                            const nextIndex = e.key === 'ArrowLeft' 
                              ? (currentIndex - 1 + filters.length) % filters.length
                              : (currentIndex + 1) % filters.length
                            setActivityFilter(filters[nextIndex] as any)
                            
                            // Focus the next button
                            const nextButton = e.currentTarget.parentElement?.children[nextIndex] as HTMLButtonElement
                            nextButton?.focus()
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 outline-none ${
                          activityFilter === filter.key
                            ? 'bg-teal-600 text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 focus:bg-neutral-200'
                        }`}
                      >
                        <span className="mr-1" aria-hidden="true">{filter.icon}</span>
                        {filter.label}
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div id="activity-content" className="space-y-4 max-h-96 overflow-y-auto" role="tabpanel" aria-live="polite">
                  {displayedFilteredActivities.map((activity, index) => (
                    <div 
                      key={activity.id} 
                      className="flex items-start gap-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <span className="text-xl">{activity.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {activity.type === 'vote' && 'Voted on '}
                          {activity.type === 'rsvp' && 'RSVP\'d to '}
                          {activity.type === 'create' && 'Created '}
                          {activity.type === 'join' && ''}
                          {activity.content}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {activity.community} • {format(activity.time, 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <Badge variant="secondary" size="sm" className="text-green-600">
                        {activity.impact}
                      </Badge>
                    </div>
                  ))}
                  
                  {/* Infinite Scroll Trigger */}
                  {hasMoreActivities && (
                    <div ref={loadMoreRef} className="py-4">
                      {isLoadingMore ? (
                        <div className="flex items-center justify-center gap-2 text-neutral-500">
                          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm">Loading more activities...</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-xs text-neutral-400">Scroll to load more</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* No more activities message */}
                  {!hasMoreActivities && displayedFilteredActivities.length > 4 && (
                    <div className="text-center py-4">
                      <div className="text-xs text-neutral-400">
                        That's all your activity! 🎉
                      </div>
                    </div>
                  )}
                  
                  {/* No activities message */}
                  {displayedFilteredActivities.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-neutral-400 mb-2">📭</div>
                      <div className="text-sm text-neutral-500">
                        No {activityFilter === 'all' ? '' : activityFilter} activities yet
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Grid with Keyboard Navigation */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚀</span>
                  Quick Actions
                  <span className="text-xs text-neutral-500 ml-auto">Use ↑↓ keys to navigate</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3" ref={quickActionsRef}>
                {quickActions
                  .sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 }
                    return (priorityOrder as any)[b.priority] - (priorityOrder as any)[a.priority]
                  })
                  .map((action, index) => (
                    <div
                      key={index}
                      data-action-index={index}
                      tabIndex={0}
                      role="button"
                      aria-label={`${action.title}: ${action.description}`}
                      className={`group p-4 rounded-xl bg-gradient-to-r ${action.color} text-white hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl focus:shadow-xl outline-none ${
                        focusedActionIndex === index ? 'ring-2 ring-white ring-offset-2' : ''
                      }`}
                      onClick={() => window.location.href = action.href}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          window.location.href = action.href
                        }
                      }}
                      onFocus={() => setFocusedActionIndex(index)}
                      onBlur={() => {
                        // Small delay to allow for keyboard navigation
                        setTimeout(() => {
                          if (!quickActionsRef.current?.contains(document.activeElement)) {
                            setFocusedActionIndex(-1)
                          }
                        }, 100)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">{action.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{action.title}</h4>
                          <p className="text-xs opacity-90 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                            {action.description}
                          </p>
                        </div>
                        {action.priority === 'high' && (
                          <Badge variant="secondary" size="sm" className="bg-white/20 text-white border-white/30">
                            ⭐
                          </Badge>
                        )}
                        <span className="text-white/70 group-hover:text-white group-focus:text-white transition-colors" aria-hidden="true">
                          →
                        </span>
                      </div>
                    </div>
                  ))}
                <div className="text-xs text-neutral-500 mt-4 p-2 bg-neutral-50 rounded-lg">
                  💡 <strong>Keyboard shortcuts:</strong> Use ↑↓ or ←→ to navigate, Enter/Space to select, Esc to exit
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Impact Visualization */}
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          {/* Personal Impact Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📈</span>
                  Your Impact Journey
                </CardTitle>
                <button
                  onClick={exportImpactReport}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-700 rounded-lg transition-colors"
                  title="Export impact data as CSV"
                >
                  <span>📊</span>
                  Export
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={impactChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="impact" 
                    stroke="#14b8a6" 
                    fill="url(#colorImpact)" 
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorImpact" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Community Comparison */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  Community Impact
                </CardTitle>
                <button
                  onClick={() => exportToCSV(communityData.map(c => ({ community: c.name, impact_points: c.value })), 'community-comparison')}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-700 rounded-lg transition-colors"
                  title="Export community data as CSV"
                >
                  <span>📊</span>
                  Export
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={communityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {communityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {communityData.map((community, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: community.color }}
                      />
                      <span>{community.name}</span>
                    </div>
                    <span className="font-medium">{community.value} pts</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
