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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Banner Section */}
      <div className="relative bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 text-white overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-300 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Community Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl md:text-5xl font-bold">{community.name}</h1>
                {userMembership && (
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-white/30">
                    ✓ {(userMembership as any)?.role}
                  </span>
                )}
              </div>
              
              {community.address && (
                <p className="text-teal-100 flex items-center gap-2 mb-4">
                  <span>📍</span>
                  <span className="text-lg">{community.address}</span>
                </p>
              )}
              
              <p className="text-teal-50 text-lg max-w-2xl mb-6">{community.description}</p>
              
              {/* Core Values Pills */}
              <div className="flex flex-wrap gap-2">
                {community.core_values.map((value, index) => (
                  <span 
                    key={index}
                    className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium border border-white/30"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {user && !userMembership && (
                <JoinCommunityButton 
                  communityId={community.id} 
                  userId={(user as any).id}
                />
              )}
              
              {userMembership && ((userMembership as any)?.role === 'founder' || (userMembership as any)?.role === 'admin') && (
                <Link
                  href={`/communities/${community.id}/settings`}
                  className="flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-xl border border-white/30 transition-all duration-300 font-medium"
                >
                  <span>⚙️</span>
                  <span>Settings</span>
                </Link>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold">{community.member_count}</div>
              <div className="text-teal-100 text-sm">Members</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold">{community.core_values.length}</div>
              <div className="text-teal-100 text-sm">Core Values</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold">
                {new Date(community.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
              <div className="text-teal-100 text-sm">Est.</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold">✨</div>
              <div className="text-teal-100 text-sm">Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <CommunityTabs 
            communityId={community.id}
            communityName={community.name}
            memberCount={community.member_count}
            userRole={(userMembership as any)?.role || null}
          />
        </div>

        {/* Admin Moderation (if applicable) */}
        {user && (user.user_type === 'admin' || (userMembership && ((userMembership as any)?.role === 'founder' || (userMembership as any)?.role === 'admin'))) && (
          <div className="mt-6">
            <AdminModerationButtons
              communityId={community.id}
              communityName={community.name}
              userType={user?.user_type || 'user'}
              userRole={userMembership?.role || null}
            />
          </div>
        )}

        {/* Quick Navigation */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/communities"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 transition-colors font-medium"
          >
            <span>←</span>
            <span>Back to Communities</span>
          </Link>
          
          <Link
            href="/communities"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors font-medium"
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
