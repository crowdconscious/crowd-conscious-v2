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

  return (profile as any)?.user_type === 'admin'
}

async function getMetricsData() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    const { count: realtimeUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('updated_at', twentyFourHoursAgo.toISOString())

    const { data: dailySignups } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })

    return {
      realtime: {
        activeUsers: realtimeUsers || 0,
        paymentSuccessRate: 100
      },
      totals: {
        users: totalUsers || 0,
        communities: 0,
        content: 0,
        funding: 0
      },
      charts: {
        dailySignups: dailySignups || [],
        communityGrowth: [],
        contentCreation: []
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

  const isAdmin = await checkAdminAccess((user as any).id)
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
