import { getCurrentUser } from '../../../../../lib/auth-server'
import { supabase } from '../../../../../lib/supabase'
import { notFound, redirect } from 'next/navigation'
import CommunityMediaSettings from './CommunityMediaSettings'
import CommunityBasicSettings from './CommunityBasicSettings'

interface CommunitySettingsPageProps {
  params: Promise<{
    id: string
  }>
}

interface Community {
  id: string
  name: string
  description: string | null
  image_url: string | null
  logo_url: string | null
  banner_url: string | null
  core_values: string[]
  address: string | null
  creator_id: string
}

async function getCommunity(id: string): Promise<Community | null> {
  const { data, error } = await supabase
    .from('communities')
    .select('id, name, description, image_url, logo_url, banner_url, core_values, address, creator_id')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching community:', error)
    return null
  }

  return data
}

async function checkUserPermissions(communityId: string, userId: string): Promise<{ canAccess: boolean; role: string | null }> {
  const { data, error } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()

  if (error) return { canAccess: false, role: null }
  
  // Only founders and admins can access settings, but only founders can upload media
  const canAccess = (data as any)?.role === 'founder' || (data as any)?.role === 'admin'
  return { canAccess, role: (data as any)?.role }
}

export default async function CommunitySettingsPage({ params }: CommunitySettingsPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const { id } = await params
  const community = await getCommunity(id)

  if (!community) {
    notFound()
  }

  // Check if user has permission to edit community settings
  const { canAccess, role } = await checkUserPermissions(community.id, (user as any).id)
  if (!canAccess) {
    redirect(`/communities/${community.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Community Settings</h1>
            <p className="text-slate-600 mt-2">{community.name}</p>
          </div>
          
          <a
            href={`/communities/${community.id}`}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            ← Back to Community
          </a>
        </div>
        
        <p className="text-slate-600">
          Manage your community's appearance, media, and settings. Changes will be visible to all community members.
        </p>
      </div>

      {/* Media Settings - Only show to founders */}
      {role === 'founder' ? (
        <CommunityMediaSettings community={community} />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Community Media</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <span>⚠️</span>
              <span className="font-medium">Founder Access Required</span>
            </div>
            <p className="text-amber-600 mt-2 text-sm">
              Only community founders can upload and manage community media (logos, banners, images). 
              Contact the community founder to request changes.
            </p>
          </div>
        </div>
      )}

      {/* Basic Info Settings */}
      <CommunityBasicSettings community={community} />
    </div>
  )
}
