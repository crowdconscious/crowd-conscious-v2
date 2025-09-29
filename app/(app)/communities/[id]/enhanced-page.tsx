import { getCurrentUser } from '../../../../lib/auth-server'
import { supabase } from '../../../../lib/supabase'
import { notFound } from 'next/navigation'
import EnhancedCommunityClient from './EnhancedCommunityClient'

interface Community {
  id: string
  name: string
  description: string | null
  image_url: string | null
  address: string | null
  core_values: string[]
  member_count: number
  creator_id: string
  created_at: string
}

interface Member {
  id: string
  role: 'founder' | 'admin' | 'member'
  joined_at: string
  profiles: {
    full_name: string | null
    email: string | null
    avatar_url?: string | null
  } | null
}

interface ContentItem {
  id: string
  type: 'need' | 'event' | 'challenge' | 'poll'
  title: string
  description: string | null
  image_url: string | null
  status: 'draft' | 'voting' | 'approved' | 'active' | 'completed'
  funding_goal: number | null
  current_funding: number
  created_at: string
  created_by: string
  profiles: {
    full_name: string | null
    email: string | null
  } | null
}

async function getCommunity(id: string): Promise<Community | null> {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching community:', error)
    return null
  }

  return data
}

async function getCommunityMembers(communityId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('community_members')
    .select(`
      id,
      role,
      joined_at,
      profiles (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('community_id', communityId)
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Error fetching community members:', error)
    return []
  }

  return (data as any) || []
}

async function getCommunityContent(communityId: string): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from('community_content')
    .select(`
      *,
      profiles (
        full_name,
        email
      )
    `)
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching community content:', error)
    return []
  }

  return data || []
}

async function checkUserMembership(communityId: string, userId: string) {
  const { data, error } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

async function getCommunityStats(communityId: string) {
  // Get content counts by type
  const { data: contentStats } = await supabase
    .from('community_content')
    .select('type')
    .eq('community_id', communityId)

  const stats = {
    total_content: contentStats?.length || 0,
    needs: contentStats?.filter((c: any) => c.type === 'need').length || 0,
    events: contentStats?.filter((c: any) => c.type === 'event').length || 0,
    polls: contentStats?.filter((c: any) => c.type === 'poll').length || 0,
    challenges: contentStats?.filter((c: any) => c.type === 'challenge').length || 0,
  }

  return stats
}

export default async function EnhancedCommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  const { id } = await params
  
  const [community, members, content, userMembership, stats] = await Promise.all([
    getCommunity(id),
    getCommunityMembers(id),
    getCommunityContent(id),
    user ? checkUserMembership(id, (user as any).id) : null,
    getCommunityStats(id)
  ])

  if (!community) {
    notFound()
  }

  // Sort members by role priority
  const roleOrder = { founder: 0, admin: 1, member: 2 }
  const sortedMembers = members.sort((a: any, b: any) => (roleOrder as any)[a.role] - (roleOrder as any)[b.role])

  // Add engagement metrics to content (simulated for demo)
  const enhancedContent = content.map(item => ({
    ...item,
    created_by_name: item.profiles?.full_name || item.profiles?.email || 'Unknown',
    engagement_metrics: {
      votes: Math.floor(Math.random() * 20) + 1,
      rsvps: Math.floor(Math.random() * 15) + 1,
      completions: Math.floor(Math.random() * 10),
      comments: Math.floor(Math.random() * 25) + 1,
    }
  }))

  return (
    <EnhancedCommunityClient
      community={community}
      members={sortedMembers}
      content={enhancedContent}
      userMembership={userMembership}
      stats={stats}
      currentUser={user}
    />
  )
}
