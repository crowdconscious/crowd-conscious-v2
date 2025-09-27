import { getCurrentUser } from '../../../lib/auth-server'
import { supabase } from '../../../lib/supabase'
import DashboardNavigation from '@/components/DashboardNavigation'
import ProfileClient from './ProfileClient'

async function getUserCommunities(userId: string) {
  const { data, error } = await supabase
    .from('community_members')
    .select(`
      role,
      joined_at,
      community:communities (
        id,
        name,
        description,
        image_url,
        logo_url,
        member_count,
        core_values
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching user communities:', error)
    return []
  }

  return data || []
}

async function getUserImpactStats(userId: string) {
  // Get user's votes count
  const { data: votes } = await supabase
    .from('votes')
    .select('id')
    .eq('user_id', userId)

  // Get user's created content count
  const { data: content } = await supabase
    .from('community_content')
    .select('id, type')
    .eq('created_by', userId)

  return {
    votes_cast: votes?.length || 0,
    content_created: content?.length || 0,
    needs_created: content?.filter((c: any) => c.type === 'need').length || 0,
    events_created: content?.filter((c: any) => c.type === 'event').length || 0,
  }
}

async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      follower_count,
      following_count
    `)
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user settings:', error)
  }

  return data || {
    theme: 'light',
    language: 'en',
    currency: 'USD',
    email_notifications: true,
    push_notifications: true,
    marketing_emails: false,
    privacy_level: 'public'
  }
}

export default async function ProfilePage() {
  const user = await getCurrentUser()
  
  if (!user) {
    return <div>Please log in to view your profile.</div>
  }

  const [profile, userCommunities, impactStats, userSettings] = await Promise.all([
    getProfile((user as any).id),
    getUserCommunities((user as any).id),
    getUserImpactStats((user as any).id),
    getUserSettings((user as any).id)
  ])

  return (
    <div className="space-y-8">
      <DashboardNavigation />
      
      <ProfileClient 
        user={user}
        profile={profile}
        userCommunities={userCommunities}
        impactStats={impactStats}
        userSettings={userSettings}
      />
    </div>
  )
}
