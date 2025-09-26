import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import AdminDashboardClient from './AdminDashboardClient'

async function getAdminStats() {
  // Get pending communities
  const { count: pendingCommunities } = await supabase
    .from('communities')
    .select('id', { count: 'exact' })
    .eq('moderation_status', 'pending')

  // Get pending sponsorships that need review
  const { count: pendingSponsorships } = await supabase
    .from('sponsorships')
    .select('id', { count: 'exact' })
    .eq('status', 'pending')

  // Get flagged content
  const { count: flaggedContent } = await supabase
    .from('community_content')
    .select('id', { count: 'exact' })
    .eq('status', 'draft') // Using draft as flagged for now

  // Get suspended users
  const { count: suspendedUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('suspended', true)

  // Get recent admin actions
  const { data: recentActions } = await supabase
    .from('admin_actions')
    .select(`
      id,
      action_type,
      target_type,
      target_id,
      details,
      created_at,
      profiles:admin_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get platform metrics
  const { count: totalCommunities } = await supabase
    .from('communities')
    .select('id', { count: 'exact' })

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('suspended', false)

  const { data: totalFunding } = await supabase
    .from('sponsorships')
    .select('amount')
    .eq('status', 'paid')

  const totalFundingAmount = totalFunding?.reduce((sum, s) => sum + s.amount, 0) || 0

  return {
    pendingCommunities: pendingCommunities || 0,
    pendingSponsorships: pendingSponsorships || 0,
    flaggedContent: flaggedContent || 0,
    suspendedUsers: suspendedUsers || 0,
    recentActions: recentActions || [],
    totalCommunities: totalCommunities || 0,
    totalUsers: totalUsers || 0,
    totalFunding: totalFundingAmount
  }
}

async function getDetailedData() {
  // Get recent communities for review
  const { data: recentCommunities } = await supabase
    .from('communities')
    .select(`
      id,
      name,
      description,
      created_at,
      moderation_status,
      profiles:creator_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get recent sponsorships for review
  const { data: recentSponsorships } = await supabase
    .from('sponsorships')
    .select(`
      id,
      amount,
      status,
      created_at,
      requires_admin_review,
      profiles:sponsor_id (
        full_name,
        company_name,
        email
      ),
      community_content (
        title,
        communities (
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get platform settings
  const { data: platformSettings } = await supabase
    .from('platform_settings')
    .select('*')
    .order('setting_key')

  return {
    recentCommunities: recentCommunities || [],
    recentSponsorships: recentSponsorships || [],
    platformSettings: platformSettings || []
  }
}

export default async function AdminDashboard() {
  const user = await getCurrentUser()
  
  if (!user) {
    return <div>Unauthorized</div>
  }

  const [stats, detailedData] = await Promise.all([
    getAdminStats(),
    getDetailedData()
  ])

  return (
    <AdminDashboardClient 
      user={user}
      stats={stats}
      detailedData={detailedData}
    />
  )
}
