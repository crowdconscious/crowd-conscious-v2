import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import MetricsClient from './MetricsClient'
import DashboardNavigation from '@/components/DashboardNavigation'

async function checkAdminAccess(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .single()

  return profile?.user_type === 'admin'
}

async function getMetricsData() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // Real-time user count (logged in within last 24 hours)
    const { count: realtimeUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('updated_at', twentyFourHoursAgo.toISOString())

    // Daily signups for the last 30 days
    const { data: dailySignups } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Payment success rate (from sponsorships)
    const { data: allPayments } = await supabase
      .from('sponsorships')
      .select('status, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())

    const totalPayments = allPayments?.length || 0
    const successfulPayments = allPayments?.filter(p => p.status === 'paid').length || 0
    const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 100

    // Community growth
    const { data: communityGrowth } = await supabase
      .from('communities')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Content creation rate
    const { data: contentCreation } = await supabase
      .from('community_content')
      .select('created_at, type')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Total counts
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })

    const { count: totalCommunities } = await supabase
      .from('communities')
      .select('id', { count: 'exact' })

    const { count: totalContent } = await supabase
      .from('community_content')
      .select('id', { count: 'exact' })

    // Total funding raised
    const { data: fundingData } = await supabase
      .from('sponsorships')
      .select('amount')
      .eq('status', 'paid')

    const totalFunding = fundingData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0

    return {
      realtime: {
        activeUsers: realtimeUsers || 0,
        paymentSuccessRate: Math.round(paymentSuccessRate)
      },
      totals: {
        users: totalUsers || 0,
        communities: totalCommunities || 0,
        content: totalContent || 0,
        funding: totalFunding
      },
      charts: {
        dailySignups: dailySignups || [],
        communityGrowth: communityGrowth || [],
        contentCreation: contentCreation || []
      }
    }
  } catch (error) {
    console.error('Error fetching metrics data:', error)
    return {
      realtime: { activeUsers: 0, paymentSuccessRate: 100 },
      totals: { users: 0, communities: 0, content: 0, funding: 0 },
      charts: { dailySignups: [], communityGrowth: [], contentCreation: [] }
    }
  }
}

export default async function MetricsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const isAdmin = await checkAdminAccess(user.id)
  if (!isAdmin) {
    redirect('/dashboard')
  }

  const metricsData = await getMetricsData()

  return (
    <div className="space-y-8">
      <DashboardNavigation />
      
      <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-xl p-6">
        <h1 className="text-3xl font-bold mb-2">📊 Platform Metrics</h1>
        <p className="text-teal-100">
          Real-time monitoring and analytics dashboard
        </p>
      </div>

      <MetricsClient metricsData={metricsData} />
    </div>
  )
}
