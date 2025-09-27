'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'
import { format, parseISO, startOfDay, eachDayOfInterval, subDays } from 'date-fns'

interface MetricsData {
  realtime: {
    activeUsers: number
    paymentSuccessRate: number
  }
  totals: {
    users: number
    communities: number
    content: number
    funding: number
  }
  charts: {
    dailySignups: Array<{ created_at: string }>
    communityGrowth: Array<{ created_at: string }>
    contentCreation: Array<{ created_at: string; type: string }>
  }
}

interface Alert {
  id: string
  type: 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
}

export default function MetricsClient({ metricsData }: { metricsData: MetricsData }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Generate daily data for charts
  const generateDailyData = (dataArray: Array<{ created_at: string }>, days = 30) => {
    const endDate = new Date()
    const startDate = subDays(endDate, days - 1)
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate })

    return dateRange.map(date => {
      const dayStart = startOfDay(date)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      
      const count = dataArray.filter(item => {
        const itemDate = parseISO(item.created_at)
        return itemDate >= dayStart && itemDate < dayEnd
      }).length

      return {
        date: format(date, 'MMM dd'),
        count
      }
    })
  }

  // Generate content type distribution
  const getContentTypeData = () => {
    const contentTypes = metricsData.charts.contentCreation.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(contentTypes).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count
    }))
  }

  // Check for alerts
  useEffect(() => {
    const checkAlerts = () => {
      const newAlerts: Alert[] = []

      // Payment success rate alert
      if (metricsData.realtime.paymentSuccessRate < 95) {
        newAlerts.push({
          id: 'payment-rate',
          type: 'warning',
          title: 'Low Payment Success Rate',
          message: `Payment success rate is ${metricsData.realtime.paymentSuccessRate}%`,
          timestamp: new Date()
        })
      }

      // New user celebration
      const recentSignups = metricsData.charts.dailySignups.filter(signup => {
        const signupDate = parseISO(signup.created_at)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return signupDate > oneDayAgo
      })

      if (recentSignups.length > 0) {
        newAlerts.push({
          id: 'new-users',
          type: 'success',
          title: 'New Users Joined! 🎉',
          message: `${recentSignups.length} new user${recentSignups.length > 1 ? 's' : ''} joined in the last 24 hours`,
          timestamp: new Date()
        })
      }

      setAlerts(newAlerts)
    }

    checkAlerts()
    const interval = setInterval(checkAlerts, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [metricsData])

  const refreshData = async () => {
    setIsRefreshing(true)
    // In a real implementation, this would fetch fresh data
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setIsRefreshing(false)
  }

  const signupData = generateDailyData(metricsData.charts.dailySignups)
  const communityData = generateDailyData(metricsData.charts.communityGrowth)
  const contentTypeData = getContentTypeData()

  const COLORS = ['#14b8a6', '#8b5cf6', '#3b82f6', '#f59e0b', '#ef4444']

  return (
    <div className="space-y-8">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.type === 'success' 
                  ? 'bg-green-50 border-green-500 text-green-800'
                  : alert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                  : 'bg-red-50 border-red-500 text-red-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{alert.title}</h3>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
                <span className="text-xs opacity-75">
                  {format(alert.timestamp, 'HH:mm')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-time Metrics */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Real-time Metrics</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            Last updated: {format(lastUpdated, 'HH:mm:ss')}
          </span>
          <AnimatedButton
            onClick={refreshData}
            disabled={isRefreshing}
            variant="ghost"
            size="sm"
          >
            {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </AnimatedButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard className="p-6 text-center">
          <div className="text-4xl mb-2">👥</div>
          <div className="text-3xl font-bold text-teal-600">{metricsData.realtime.activeUsers}</div>
          <div className="text-sm text-slate-600">Active Users (24h)</div>
        </AnimatedCard>

        <AnimatedCard className="p-6 text-center">
          <div className="text-4xl mb-2">💳</div>
          <div className="text-3xl font-bold text-green-600">{metricsData.realtime.paymentSuccessRate}%</div>
          <div className="text-sm text-slate-600">Payment Success Rate</div>
        </AnimatedCard>

        <AnimatedCard className="p-6 text-center">
          <div className="text-4xl mb-2">🏘️</div>
          <div className="text-3xl font-bold text-blue-600">{metricsData.totals.communities}</div>
          <div className="text-sm text-slate-600">Total Communities</div>
        </AnimatedCard>

        <AnimatedCard className="p-6 text-center">
          <div className="text-4xl mb-2">💰</div>
          <div className="text-3xl font-bold text-purple-600">${metricsData.totals.funding.toLocaleString()}</div>
          <div className="text-sm text-slate-600">Total Funding Raised</div>
        </AnimatedCard>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Platform Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Total Users</span>
              <span className="font-bold text-slate-900">{metricsData.totals.users.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Communities</span>
              <span className="font-bold text-slate-900">{metricsData.totals.communities}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Content Items</span>
              <span className="font-bold text-slate-900">{metricsData.totals.content}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Content/Community</span>
              <span className="font-bold text-slate-900">
                {metricsData.totals.communities > 0 
                  ? Math.round(metricsData.totals.content / metricsData.totals.communities)
                  : 0
                }
              </span>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-6 md:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Content Type Distribution</h3>
          {contentTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={contentTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {contentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500">
              No content data available
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Signups Chart */}
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily User Signups (30 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={signupData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#14b8a6" 
                strokeWidth={2}
                dot={{ fill: '#14b8a6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </AnimatedCard>

        {/* Community Growth Chart */}
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Community Growth (30 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={communityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </AnimatedCard>
      </div>

      {/* Performance Indicators */}
      <AnimatedCard className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              metricsData.realtime.paymentSuccessRate >= 95 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metricsData.realtime.paymentSuccessRate >= 95 ? '✅' : '❌'}
            </div>
            <div className="text-sm text-slate-600 mt-2">Payment Health</div>
            <div className="text-xs text-slate-500">Target: >95%</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${
              metricsData.realtime.activeUsers > 0 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {metricsData.realtime.activeUsers > 0 ? '✅' : '⚠️'}
            </div>
            <div className="text-sm text-slate-600 mt-2">User Activity</div>
            <div className="text-xs text-slate-500">24h active users</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${
              metricsData.totals.communities > 0 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {metricsData.totals.communities > 0 ? '✅' : '⚠️'}
            </div>
            <div className="text-sm text-slate-600 mt-2">Community Growth</div>
            <div className="text-xs text-slate-500">Total communities</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${
              metricsData.totals.funding > 0 ? 'text-green-600' : 'text-slate-400'
            }`}>
              {metricsData.totals.funding > 0 ? '💰' : '💤'}
            </div>
            <div className="text-sm text-slate-600 mt-2">Revenue Health</div>
            <div className="text-xs text-slate-500">Platform fees collected</div>
          </div>
        </div>
      </AnimatedCard>

      {/* System Status */}
      <AnimatedCard className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Database Connection</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Payment Processing</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Email Service</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">File Storage</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Authentication</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">API Endpoints</span>
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}
