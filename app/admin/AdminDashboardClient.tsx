'use client'

import { useState } from 'react'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'

interface AdminStats {
  pendingCommunities: number
  pendingSponsorships: number
  flaggedContent: number
  suspendedUsers: number
  recentActions: any[]
  totalCommunities: number
  totalUsers: number
  totalFunding: number
}

interface DetailedData {
  recentCommunities: any[]
  recentSponsorships: any[]
  platformSettings: any[]
  recentUsers: any[]
}

interface AdminDashboardClientProps {
  user: any
  stats: AdminStats
  detailedData: DetailedData
}

export default function AdminDashboardClient({ 
  user, 
  stats, 
  detailedData 
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'communities' | 'sponsorships' | 'users' | 'settings'>('overview')
  const [editingSettings, setEditingSettings] = useState<{[key: string]: string}>({})

  const handleCommunityAction = async (communityId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch('/api/admin/moderate-community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId, action, notes })
      })

      if (response.ok) {
        window.location.reload() // Simple refresh for now
      } else {
        alert('Failed to moderate community')
      }
    } catch (error) {
      console.error('Error moderating community:', error)
      alert('Error moderating community')
    }
  }

  const handleSponsorshipAction = async (sponsorshipId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch('/api/admin/moderate-sponsorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorshipId, action, notes })
      })

      if (response.ok) {
        window.location.reload() // Simple refresh for now
      } else {
        alert('Failed to moderate sponsorship')
      }
    } catch (error) {
      console.error('Error moderating sponsorship:', error)
      alert('Error moderating sponsorship')
    }
  }

  const handleUserSuspension = async (userId: string, action: 'suspend' | 'unsuspend', reason?: string) => {
    try {
      const response = await fetch('/api/admin/moderate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, reason })
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to moderate user')
      }
    } catch (error) {
      console.error('Error moderating user:', error)
      alert('Error moderating user')
    }
  }

  const handleUpdateSetting = async (settingKey: string, value: string) => {
    try {
      const response = await fetch('/api/admin/update-setting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingKey, value })
      })

      if (response.ok) {
        alert('Setting updated successfully!')
        setEditingSettings(prev => {
          const newSettings = { ...prev }
          delete newSettings[settingKey]
          return newSettings
        })
        window.location.reload()
      } else {
        alert('Failed to update setting')
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      alert('Error updating setting')
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'communities', label: 'Communities', icon: '🏘️' },
          { key: 'sponsorships', label: 'Sponsorships', icon: '💰' },
          { key: 'users', label: 'Users', icon: '👥' },
          { key: 'settings', label: 'Settings', icon: '⚙️' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-red-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedCard className="p-6 text-center border-l-4 border-l-orange-500">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingCommunities}</div>
              <div className="text-sm text-slate-600">Pending Communities</div>
            </AnimatedCard>

            <AnimatedCard className="p-6 text-center border-l-4 border-l-blue-500">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-blue-600">{stats.pendingSponsorships}</div>
              <div className="text-sm text-slate-600">Pending Sponsorships</div>
            </AnimatedCard>

            <AnimatedCard className="p-6 text-center border-l-4 border-l-red-500">
              <div className="text-3xl mb-2">🚫</div>
              <div className="text-2xl font-bold text-red-600">{stats.suspendedUsers}</div>
              <div className="text-sm text-slate-600">Suspended Users</div>
            </AnimatedCard>

            <AnimatedCard className="p-6 text-center border-l-4 border-l-green-500">
              <div className="text-3xl mb-2">🌱</div>
              <div className="text-2xl font-bold text-green-600">${stats.totalFunding.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Total Platform Funding</div>
            </AnimatedCard>
          </div>

          {/* Platform Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AnimatedCard className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Platform Health</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Communities:</span>
                  <span className="font-medium">{stats.totalCommunities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Active Users:</span>
                  <span className="font-medium">{stats.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Platform Revenue (15%):</span>
                  <span className="font-medium text-green-600">${(stats.totalFunding * 0.15).toLocaleString()}</span>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard className="p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Admin Actions</h3>
              <div className="space-y-3">
                {stats.recentActions.length > 0 ? stats.recentActions.slice(0, 5).map(action => (
                  <div key={action.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                    <div>
                      <span className="font-medium">{action.profiles?.full_name || 'Admin'}</span>
                      <span className="text-slate-600 ml-2">{action.action_type.replace('_', ' ')}</span>
                      <span className="text-slate-500 ml-2">on {action.target_type}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(action.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )) : (
                  <p className="text-slate-500 text-center py-4">No recent actions</p>
                )}
              </div>
            </AnimatedCard>
          </div>
        </div>
      )}

      {/* Communities Tab */}
      {activeTab === 'communities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Community Moderation</h2>
            <div className="text-sm text-slate-600">
              {stats.pendingCommunities} pending review
            </div>
          </div>

          <div className="space-y-4">
            {detailedData.recentCommunities.map(community => (
              <AnimatedCard key={community.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{community.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        community.moderation_status === 'pending' 
                          ? 'bg-orange-100 text-orange-800'
                          : community.moderation_status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {community.moderation_status}
                      </span>
                    </div>
                    <p className="text-slate-700 mb-3 line-clamp-2">{community.description}</p>
                    <div className="text-sm text-slate-500">
                      Created by: {community.profiles?.full_name || community.profiles?.email} •{' '}
                      {new Date(community.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {community.moderation_status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <AnimatedButton
                        size="sm"
                        onClick={() => handleCommunityAction(community.id, 'approve')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </AnimatedButton>
                      <AnimatedButton
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const notes = prompt('Rejection reason (optional):')
                          handleCommunityAction(community.id, 'reject', notes || undefined)
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </AnimatedButton>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      )}

      {/* Sponsorships Tab */}
      {activeTab === 'sponsorships' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Sponsorship Moderation</h2>
            <div className="text-sm text-slate-600">
              {stats.pendingSponsorships} pending review
            </div>
          </div>

          <div className="space-y-4">
            {detailedData.recentSponsorships.map(sponsorship => (
              <AnimatedCard key={sponsorship.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        ${sponsorship.amount.toLocaleString()} Sponsorship
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sponsorship.status === 'pending' 
                          ? 'bg-orange-100 text-orange-800'
                          : sponsorship.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sponsorship.status}
                      </span>
                      {sponsorship.requires_admin_review && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Needs Admin Review
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 mb-2">
                      <strong>Need:</strong> {sponsorship.community_content?.title}
                    </p>
                    <p className="text-slate-700 mb-3">
                      <strong>Community:</strong> {sponsorship.community_content?.communities?.name}
                    </p>
                    <div className="text-sm text-slate-500">
                      From: {sponsorship.profiles?.company_name || sponsorship.profiles?.full_name} •{' '}
                      {new Date(sponsorship.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {sponsorship.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <AnimatedButton
                        size="sm"
                        onClick={() => handleSponsorshipAction(sponsorship.id, 'approve')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </AnimatedButton>
                      <AnimatedButton
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const notes = prompt('Rejection reason (optional):')
                          handleSponsorshipAction(sponsorship.id, 'reject', notes || undefined)
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </AnimatedButton>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
            <div className="text-sm text-slate-600">
              {stats.totalUsers} total users • {stats.suspendedUsers} suspended
            </div>
          </div>

          <div className="space-y-4">
            {detailedData.recentUsers.map(user => (
              <AnimatedCard key={user.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {user.full_name || user.company_name || user.email}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.user_type === 'admin' 
                          ? 'bg-red-100 text-red-800'
                          : user.user_type === 'brand'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.user_type || 'user'}
                      </span>
                      {user.suspended && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 mb-2">
                      <strong>Email:</strong> {user.email}
                    </p>
                    {user.company_name && (
                      <p className="text-slate-700 mb-2">
                        <strong>Company:</strong> {user.company_name}
                      </p>
                    )}
                    <div className="text-sm text-slate-500">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {user.user_type !== 'admin' && (
                    <div className="flex gap-2 ml-4">
                      {user.suspended ? (
                        <AnimatedButton
                          size="sm"
                          onClick={() => handleUserSuspension(user.id, 'unsuspend')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Unsuspend
                        </AnimatedButton>
                      ) : (
                        <AnimatedButton
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const reason = prompt('Suspension reason:')
                            if (reason) {
                              handleUserSuspension(user.id, 'suspend', reason)
                            }
                          }}
                          className="text-red-600 hover:bg-red-50"
                        >
                          Suspend
                        </AnimatedButton>
                      )}
                    </div>
                  )}
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Platform Settings</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {detailedData.platformSettings.map(setting => (
              <AnimatedCard key={setting.id} className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </h3>
                <p className="text-slate-600 text-sm mb-3">{setting.description}</p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editingSettings[setting.setting_key] !== undefined ? editingSettings[setting.setting_key] : setting.setting_value}
                    onChange={(e) => setEditingSettings(prev => ({
                      ...prev,
                      [setting.setting_key]: e.target.value
                    }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <AnimatedButton 
                    size="sm" 
                    onClick={() => handleUpdateSetting(setting.setting_key, editingSettings[setting.setting_key] || setting.setting_value)}
                    disabled={editingSettings[setting.setting_key] === undefined || editingSettings[setting.setting_key] === setting.setting_value}
                  >
                    Update
                  </AnimatedButton>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
