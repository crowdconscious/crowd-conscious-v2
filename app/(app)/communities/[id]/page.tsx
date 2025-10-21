import { getCurrentUser } from '../../../../lib/auth-server'
import { supabase } from '../../../../lib/supabase'
import { notFound } from 'next/navigation'
// @ts-ignore
import JoinCommunityButton from './JoinCommunityButton'
import CommunityTabs from './CommunityTabs'
import AdminModerationButtons from './AdminModerationButtons'
import Link from 'next/link'

// Force dynamic rendering due to authentication checks
export const dynamic = 'force-dynamic'

interface Community {
  id: string
  name: string
  description: string | null
  image_url: string | null
  logo_url: string | null
  banner_url: string | null
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
    .select('id, name, description, image_url, logo_url, banner_url, address, core_values, member_count, creator_id, created_at')
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

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  const { id } = await params
  const community = await getCommunity(id)

  if (!community) {
    notFound()
  }

  const members = await getCommunityMembers(community.id)
  const userMembership = user ? await checkUserMembership(community.id, (user as any).id) : null

  const roleOrder = { founder: 0, admin: 1, member: 2 }
  const sortedMembers = members.sort((a: any, b: any) => (roleOrder as any)[a.role] - (roleOrder as any)[b.role])

  return (
    <div className="space-y-8">
      {/* Community Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{community.name}</h1>
                {community.address && (
                  <p className="text-slate-600 flex items-center gap-2">
                    <span>📍</span>
                    {community.address}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {user && !userMembership && (
                  <JoinCommunityButton 
                    communityId={community.id} 
                    userId={(user as any).id}
                  />
                )}
                
                {userMembership && (
                  <>
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200">
                      <span>✓</span>
                      <span className="capitalize font-medium">{(userMembership as any)?.role}</span>
                    </div>
                    
                    {/* Settings button for admins/founders */}
                    {((userMembership as any)?.role === 'founder' || (userMembership as any)?.role === 'admin') && (
                      <Link
                        href={`/communities/${community.id}/settings`}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg border border-slate-200 transition-colors"
                        title="Community Settings"
                      >
                        <span>⚙️</span>
                        <span className="hidden sm:inline">Settings</span>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

        <p className="text-slate-700 mb-6">{community.description}</p>

        {/* Core Values */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Core Values</h3>
          <div className="flex flex-wrap gap-2">
            {community.core_values.map((value, index) => (
              <span 
                key={index}
                className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-medium"
              >
                {value}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <span>{community.member_count} member{community.member_count !== 1 ? 's' : ''}</span>
            <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
          </div>
          
          {/* Admin Moderation Buttons */}
          <AdminModerationButtons
            communityId={community.id}
            communityName={community.name}
            userType={user?.user_type || 'user'}
            userRole={userMembership?.role || null}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {/* Community Tabs */}
        <CommunityTabs 
          communityId={community.id}
          communityName={community.name}
          memberCount={community.member_count}
          userRole={(userMembership as any)?.role || null}
        />
      </div>


      {/* Back Navigation */}
      <div className="flex justify-between items-center">
        <Link
          href="/communities"
          className="text-slate-600 hover:text-slate-900 font-medium"
        >
          ← Back to Communities
        </Link>
        
        <Link
          href="/dashboard"
          className="text-slate-600 hover:text-slate-900 font-medium"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
