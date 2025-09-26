import { getCurrentUser } from '../../../../../lib/auth-server'
import { supabase } from '../../../../../lib/supabase'
import { notFound, redirect } from 'next/navigation'
import CommunityMediaSettings from './CommunityMediaSettings'

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
  const canAccess = data.role === 'founder' || data.role === 'admin'
  return { canAccess, role: data.role }
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
  const { canAccess, role } = await checkUserPermissions(community.id, user.id)
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
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Basic Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Community Name
            </label>
            <input
              type="text"
              defaultValue={community.name}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              placeholder="Enter community name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              defaultValue={community.description || ''}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
              placeholder="Describe your community's mission and goals..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Address / Location
            </label>
            <input
              type="text"
              defaultValue={community.address || ''}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              placeholder="Enter community location"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Core Values
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {community.core_values.map((value, index) => (
                <span 
                  key={index}
                  className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {value}
                </span>
              ))}
            </div>
            <input
              type="text"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              placeholder="Add a new core value and press Enter"
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            Save Basic Info
          </button>
        </div>
      </div>
    </div>
  )
}
