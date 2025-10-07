'use client'

import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface ImpactMetrics {
  total_communities: number
  total_content: number
  total_funding_raised: number
  total_participants: number
  content_by_type: Array<{
    type: string
    count: number
    percentage: number
  }>
  funding_by_month: Array<{
    month: string
    amount: number
  }>
  community_growth: Array<{
    month: string
    communities: number
    members: number
  }>
  top_communities: Array<{
    name: string
    impact_score: number
    member_count: number
    content_count: number
  }>
  personal_impact: {
    communities_joined: number
    content_created: number
    votes_cast: number
    events_attended: number
    total_contribution: number
  }
}

interface ImpactDashboardProps {
  userId: string
}

export default function ImpactDashboard({ userId }: ImpactDashboardProps) {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('quarter')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchImpactMetrics()
  }, [userId, timeframe])

  const fetchImpactMetrics = async () => {
    setLoading(true)
    try {
      // Calculate date range based on timeframe
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timeframe) {
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      // Fetch overall platform metrics
      const [
        communitiesResponse,
        contentResponse,
        membersResponse,
        userStatsResponse
      ] = await Promise.all([
        supabaseClient.from('communities').select('id, created_at, member_count'),
        supabaseClient.from('community_content').select('id, type, funding_goal, current_funding, created_at'),
        supabaseClient.from('community_members').select('id, community_id, created_at'),
        supabaseClient.from('community_members').select('*').eq('user_id', userId)
      ])

      // Process the data into metrics
      const communities = communitiesResponse.data || []
      const content = contentResponse.data || []
      const members = membersResponse.data || []
      const userCommunities = userStatsResponse.data || []

      // Calculate totals
      const totalFunding = content.reduce((sum, item: any) => sum + (item.current_funding || 0), 0)
      
      // Content by type
      const contentByType = content.reduce((acc: any, item: any) => {
        acc[item.type] = (acc[item.type] || 0) + 1
        return acc
      }, {})
      
      const totalContent = content.length
      const contentTypeData = Object.entries(contentByType).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: count as number,
        percentage: totalContent > 0 ? ((count as number) / totalContent) * 100 : 0
      }))

      // Calculate real funding by month from database
      const fundingByMonth = content
        .filter((item: any) => item.current_funding > 0)
        .reduce((acc: any, item: any) => {
          const date = new Date(item.created_at)
          const monthKey = date.toLocaleString('en-US', { month: 'short' })
          const existing = acc.find((m: any) => m.month === monthKey)
          if (existing) {
            existing.amount += item.current_funding
          } else {
            acc.push({ month: monthKey, amount: item.current_funding })
          }
          return acc
        }, [] as Array<{month: string, amount: number}>)
      
      // Sort by month order
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      fundingByMonth.sort((a: any, b: any) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))

      // Calculate real community growth by month
      const communityGrowth = communities
        .reduce((acc: any, comm: any) => {
          const date = new Date(comm.created_at)
          const monthKey = date.toLocaleString('en-US', { month: 'short' })
          const existing = acc.find((m: any) => m.month === monthKey)
          if (existing) {
            existing.communities += 1
            existing.members += comm.member_count || 0
          } else {
            acc.push({ 
              month: monthKey, 
              communities: 1, 
              members: comm.member_count || 0 
            })
          }
          return acc
        }, [] as Array<{month: string, communities: number, members: number}>)
      
      communityGrowth.sort((a: any, b: any) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))

      // Get real top communities (assuming name is available)
      const topCommunities = await Promise.all(
        communities.slice(0, 5).map(async (community: any) => {
          const { data: commContent } = await supabaseClient
            .from('community_content')
            .select('id')
            .eq('community_id', community.id)
          
          return {
            name: 'Community ' + community.id?.slice(-4),
            impact_score: (community.member_count || 0) + (commContent?.length || 0) * 5,
            member_count: community.member_count || 0,
            content_count: commContent?.length || 0
          }
        })
      )

      // Fetch real user stats from user_stats table
      const { data: userStats } = await supabaseClient
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      setMetrics({
        total_communities: communities.length,
        total_content: content.length,
        total_funding_raised: totalFunding,
        total_participants: members.length,
        content_by_type: contentTypeData,
        funding_by_month: fundingByMonth.length > 0 ? fundingByMonth : [{ month: new Date().toLocaleString('en-US', { month: 'short' }), amount: 0 }],
        community_growth: communityGrowth.length > 0 ? communityGrowth : [{ month: new Date().toLocaleString('en-US', { month: 'short' }), communities: 0, members: 0 }],
        top_communities: topCommunities,
        personal_impact: {
          communities_joined: userCommunities.length,
          content_created: userStats?.content_created || 0,
          votes_cast: userStats?.votes_cast || 0,
          events_attended: userStats?.events_attended || 0,
          total_contribution: userStats?.total_xp || 0
        }
      })
    } catch (error) {
      console.error('Error fetching impact metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (!metrics) return
    
    setGenerating(true)
    try {
      // Create comprehensive report data
      const reportData = {
        generated_at: new Date().toISOString(),
        timeframe: timeframe,
        user_id: userId,
        platform_metrics: {
          total_communities: metrics.total_communities,
          total_content: metrics.total_content,
          total_funding_raised: metrics.total_funding_raised,
          total_participants: metrics.total_participants
        },
        personal_impact: metrics.personal_impact,
        content_breakdown: metrics.content_by_type,
        top_communities: metrics.top_communities
      }

      // Convert to JSON and create downloadable file
      const jsonString = JSON.stringify(reportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      // Create and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = `crowd-conscious-impact-report-${timeframe}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Also generate a CSV for easier viewing
      const csvData = [
        ['Metric', 'Value'],
        ['Total Communities', metrics.total_communities],
        ['Total Content Created', metrics.total_content],
        ['Total Funding Raised', `$${metrics.total_funding_raised.toLocaleString()}`],
        ['Total Participants', metrics.total_participants],
        ['Your Communities Joined', metrics.personal_impact.communities_joined],
        ['Your Content Created', metrics.personal_impact.content_created],
        ['Your Votes Cast', metrics.personal_impact.votes_cast],
        ['Your Events Attended', metrics.personal_impact.events_attended],
        ['Your Total Contribution', `$${metrics.personal_impact.total_contribution}`]
      ]

      const csvString = csvData.map(row => row.join(',')).join('\n')
      const csvBlob = new Blob([csvString], { type: 'text/csv' })
      const csvUrl = URL.createObjectURL(csvBlob)
      
      const csvLink = document.createElement('a')
      csvLink.href = csvUrl
      csvLink.download = `crowd-conscious-impact-summary-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(csvLink)
      csvLink.click()
      document.body.removeChild(csvLink)
      URL.revokeObjectURL(csvUrl)

    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setGenerating(false)
    }
  }

  const COLORS = ['#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <AnimatedCard key={i}>
            <div className="h-64 bg-slate-200 rounded animate-pulse"></div>
          </AnimatedCard>
        ))}
      </div>
    )
  }

  if (!metrics) {
    return (
      <AnimatedCard>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Unable to Load Impact Data</h3>
          <p className="text-slate-600 mb-4">There was an error loading the impact metrics.</p>
          <AnimatedButton onClick={() => fetchImpactMetrics()}>
            Try Again
          </AnimatedButton>
        </div>
      </AnimatedCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Impact Dashboard</h2>
          <p className="text-slate-600">Track community impact and your personal contributions</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['month', 'quarter', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeframe === period
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Download Report Button */}
          <AnimatedButton
            onClick={generateReport}
            loading={generating}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <span>📊</span>
            {generating ? 'Generating...' : 'Download Report'}
          </AnimatedButton>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedCard className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">{metrics.total_communities}</div>
            <div className="text-sm text-slate-600">Active Communities</div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">${metrics.total_funding_raised.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Funding Raised</div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{metrics.total_content}</div>
            <div className="text-sm text-slate-600">Content Created</div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.total_participants}</div>
            <div className="text-sm text-slate-600">Total Members</div>
          </div>
        </AnimatedCard>
      </div>

      {/* Personal Impact */}
      <AnimatedCard className="p-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Your Personal Impact</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-teal-600">{metrics.personal_impact.communities_joined}</div>
            <div className="text-xs text-slate-600">Communities Joined</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{metrics.personal_impact.content_created}</div>
            <div className="text-xs text-slate-600">Content Created</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{metrics.personal_impact.votes_cast}</div>
            <div className="text-xs text-slate-600">Votes Cast</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{metrics.personal_impact.events_attended}</div>
            <div className="text-xs text-slate-600">Events Attended</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">${metrics.personal_impact.total_contribution}</div>
            <div className="text-xs text-slate-600">Total Contribution</div>
          </div>
        </div>
      </AnimatedCard>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content by Type */}
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Content Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={metrics.content_by_type}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                label={({ type, percentage }: any) => `${type} (${percentage?.toFixed(1)}%)`}
              >
                {metrics.content_by_type.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </AnimatedCard>

        {/* Funding Over Time */}
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Funding Raised Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.funding_by_month}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
              <Bar dataKey="amount" fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </AnimatedCard>

        {/* Community Growth */}
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Platform Growth</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics.community_growth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="communities" stroke="#8b5cf6" strokeWidth={2} name="Communities" />
              <Line type="monotone" dataKey="members" stroke="#14b8a6" strokeWidth={2} name="Members" />
            </LineChart>
          </ResponsiveContainer>
        </AnimatedCard>

        {/* Top Communities */}
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Performing Communities</h3>
          <div className="space-y-3">
            {metrics.top_communities.map((community, index) => (
              <div key={community.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-700">#{index + 1}</span>
                  <div>
                    <div className="font-medium text-slate-900">{community.name}</div>
                    <div className="text-sm text-slate-600">
                      {community.member_count} members • {community.content_count} content
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-teal-600">{community.impact_score}</div>
                  <div className="text-xs text-slate-500">Impact Score</div>
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
