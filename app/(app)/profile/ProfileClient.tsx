'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'

interface ProfileClientProps {
  user: any
  profile: any
  userCommunities: any[]
  impactStats: any
  userSettings: any
}

export default function ProfileClient({ 
  user, 
  profile, 
  userCommunities, 
  impactStats, 
  userSettings 
}: ProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editData, setEditData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    website: profile?.website || '',
    twitter: profile?.twitter || '',
    linkedin: profile?.linkedin || '',
    instagram: profile?.instagram || '',
    is_public: profile?.is_public ?? true
  })

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update(editData)
        .eq('id', user.id)

      if (error) throw error

      setIsEditing(false)
      window.location.reload() // Refresh to show updated data
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async (targetUserId: string) => {
    try {
      const { error } = await supabaseClient
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId
        })

      if (error) throw error
      // Refresh page to update follow counts
      window.location.reload()
    } catch (error) {
      console.error('Error following user:', error)
      alert('Failed to follow user')
    }
  }

  const handleUnfollow = async (targetUserId: string) => {
    try {
      const { error } = await supabaseClient
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)

      if (error) throw error
      // Refresh page to update follow counts
      window.location.reload()
    } catch (error) {
      console.error('Error unfollowing user:', error)
      alert('Failed to unfollow user')
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-purple-700 text-white rounded-xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name || 'Profile'} 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    {profile?.full_name || 'Community Member'}
                  </h1>
                  <p className="text-teal-100 mb-2">{user.email}</p>
                  {profile?.bio && (
                    <p className="text-teal-100 mb-3 max-w-2xl">{profile.bio}</p>
                  )}
                  {profile?.location && (
                    <p className="text-teal-200 text-sm mb-2">📍 {profile.location}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <AnimatedButton
                    onClick={() => setIsEditing(!isEditing)}
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </AnimatedButton>
                  
                  <Link href="/settings">
                    <AnimatedButton
                      variant="secondary"
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      ⚙️ Settings
                    </AnimatedButton>
                  </Link>
                </div>
              </div>

              {/* Social Links */}
              {(profile?.website || profile?.twitter || profile?.linkedin || profile?.instagram) && (
                <div className="flex items-center gap-4 mb-4">
                  {profile.website && (
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-teal-100 hover:text-white text-sm transition-colors"
                    >
                      🌐 Website
                    </a>
                  )}
                  {profile.twitter && (
                    <a 
                      href={`https://twitter.com/${profile.twitter}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-teal-100 hover:text-white text-sm transition-colors"
                    >
                      🐦 Twitter
                    </a>
                  )}
                  {profile.linkedin && (
                    <a 
                      href={profile.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-teal-100 hover:text-white text-sm transition-colors"
                    >
                      💼 LinkedIn
                    </a>
                  )}
                  {profile.instagram && (
                    <a 
                      href={`https://instagram.com/${profile.instagram}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-teal-100 hover:text-white text-sm transition-colors"
                    >
                      📸 Instagram
                    </a>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold">{userCommunities.length}</div>
                  <div className="text-sm text-teal-200">Communities</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold">{profile?.follower_count || 0}</div>
                  <div className="text-sm text-teal-200">Followers</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold">{profile?.following_count || 0}</div>
                  <div className="text-sm text-teal-200">Following</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold">{impactStats.votes_cast}</div>
                  <div className="text-sm text-teal-200">Votes Cast</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold">
                    {userCommunities.filter((c: any) => c.role === 'founder').length}
                  </div>
                  <div className="text-sm text-teal-200">Founded</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      {isEditing && (
        <AnimatedCard className="p-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-6">Edit Profile</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={editData.full_name}
                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={editData.location}
                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                placeholder="City, Country"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bio
              </label>
              <textarea
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Tell people about yourself..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={editData.website}
                onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                placeholder="https://your-website.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Twitter Username
              </label>
              <input
                type="text"
                value={editData.twitter}
                onChange={(e) => setEditData({ ...editData, twitter: e.target.value })}
                placeholder="username"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={editData.linkedin}
                onChange={(e) => setEditData({ ...editData, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Instagram Username
              </label>
              <input
                type="text"
                value={editData.instagram}
                onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                placeholder="username"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editData.is_public}
                  onChange={(e) => setEditData({ ...editData, is_public: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700">Make my profile public</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <AnimatedButton
              onClick={() => setIsEditing(false)}
              variant="ghost"
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              onClick={handleSaveProfile}
              loading={isLoading}
            >
              Save Changes
            </AnimatedButton>
          </div>
        </AnimatedCard>
      )}

      {/* My Communities */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">My Communities</h2>
        
        {userCommunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userCommunities.map((membership: any) => (
              <AnimatedCard key={membership.community.id} hover>
                <Link
                  href={`/communities/${membership.community.id}`}
                  className="block p-6"
                >
                  {/* Community Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                      {membership.community.logo_url ? (
                        <img
                          src={membership.community.logo_url}
                          alt={membership.community.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-white font-bold">
                          {membership.community.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{membership.community.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${membership.role === 'founder' ? 'bg-purple-100 text-purple-700' :
                            membership.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            'bg-teal-100 text-teal-700'}
                        `}>
                          {membership.role}
                        </span>
                        <span>•</span>
                        <span>{membership.community.member_count} members</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {membership.community.description || 'Building community impact together.'}
                  </p>

                  {/* Core Values */}
                  {membership.community.core_values?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {membership.community.core_values.slice(0, 2).map((value: string, index: number) => (
                        <span 
                          key={index}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full"
                        >
                          {value}
                        </span>
                      ))}
                      {membership.community.core_values.length > 2 && (
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
                          +{membership.community.core_values.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Joined Date */}
                  <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                    Joined {new Date(membership.joined_at).toLocaleDateString()}
                  </div>
                </Link>
              </AnimatedCard>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No communities yet</h3>
            <p className="text-slate-600 mb-6">Join or create your first community to get started!</p>
            <Link href="/communities">
              <AnimatedButton className="flex items-center gap-2">
                <span>🌍</span>
                <span>Explore Communities</span>
              </AnimatedButton>
            </Link>
          </div>
        )}
      </div>

      {/* Impact Summary */}
      <AnimatedCard className="p-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Your Impact</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2">🗳️</div>
            <div className="text-lg font-bold text-slate-900">{impactStats.votes_cast}</div>
            <div className="text-sm text-slate-600">Votes Cast</div>
          </div>
          
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2">💡</div>
            <div className="text-lg font-bold text-slate-900">{impactStats.needs_created}</div>
            <div className="text-sm text-slate-600">Needs Created</div>
          </div>
          
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-lg font-bold text-slate-900">{impactStats.events_created}</div>
            <div className="text-sm text-slate-600">Events Created</div>
          </div>
          
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2">🏆</div>
            <div className="text-lg font-bold text-slate-900">{userCommunities.length}</div>
            <div className="text-sm text-slate-600">Communities Joined</div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}
