'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'
import { supabaseClient } from '@/lib/supabase-client'

interface BrandDashboardData {
  brandProfile: any
  brandPreferences: any
  applications: any[]
  sponsorships: any[]
  relationships: any[]
  opportunities: any[]
}

interface BrandDashboardClientProps {
  user: any
  dashboardData: BrandDashboardData
}

export default function BrandDashboardClient({ 
  user, 
  dashboardData 
}: BrandDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'applications' | 'impact'>('overview')
  const [isApplying, setIsApplying] = useState<string | null>(null)

  const { brandProfile, applications, sponsorships, relationships, opportunities } = dashboardData

  const handleSponsorshipApplication = async (contentId: string, amount: number, message: string) => {
    setIsApplying(contentId)
    try {
      const { error } = await supabaseClient
        .from('sponsorship_applications')
        .insert({
          content_id: contentId,
          brand_id: user.id,
          proposed_amount: amount,
          message: message
        })

      if (error) throw error

      // Show success notification
      alert('Sponsorship application submitted successfully!')
      
      // Refresh page
      window.location.reload()
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Failed to submit application. Please try again.')
    } finally {
      setIsApplying(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getImpactIcon = (type: string) => {
    const icons = {
      need: '🎯',
      event: '📅',
      challenge: '🏆',
      poll: '🗳️'
    }
    return icons[type as keyof typeof icons] || '📋'
  }

  const totalSpent = sponsorships.reduce((sum, s) => sum + s.amount, 0)
  const pendingApplications = applications.filter(a => a.status === 'pending').length
  const approvedApplications = applications.filter(a => a.status === 'approved').length

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Brand Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8">
        <div className="flex items-center gap-6">
          {brandProfile.logo_url ? (
            <img 
              src={brandProfile.logo_url} 
              alt={brandProfile.company_name}
              className="w-20 h-20 rounded-xl object-cover bg-white p-2"
            />
          ) : (
            <div className="w-20 h-20 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-3xl">🏢</span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {brandProfile.company_name || brandProfile.full_name}
            </h1>
            <p className="text-blue-100 mb-2">
              {brandProfile.industry && `${brandProfile.industry} • `}
              {brandProfile.company_size && `${brandProfile.company_size} company`}
              {brandProfile.verified_brand && ' • ✓ Verified'}
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-blue-200">Total Sponsored:</span>
                <span className="font-bold ml-1">${brandProfile.total_sponsored?.toLocaleString() || 0}</span>
              </div>
              <div>
                <span className="text-blue-200">Sponsorships:</span>
                <span className="font-bold ml-1">{brandProfile.sponsorship_count || 0}</span>
              </div>
              <div>
                <span className="text-blue-200">Communities:</span>
                <span className="font-bold ml-1">{relationships.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'opportunities', label: 'Opportunities', icon: '🎯' },
          { key: 'applications', label: 'Applications', icon: '📝' },
          { key: 'impact', label: 'Impact', icon: '🌱' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stats Cards */}
          <AnimatedCard className="p-6 text-center">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold text-blue-600">${totalSpent.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Total Invested</div>
          </AnimatedCard>

          <AnimatedCard className="p-6 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-green-600">{sponsorships.length}</div>
            <div className="text-sm text-slate-600">Active Sponsorships</div>
          </AnimatedCard>

          <AnimatedCard className="p-6 text-center">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-2xl font-bold text-yellow-600">{pendingApplications}</div>
            <div className="text-sm text-slate-600">Pending Applications</div>
          </AnimatedCard>

          <AnimatedCard className="p-6 text-center">
            <div className="text-3xl mb-2">🏘️</div>
            <div className="text-2xl font-bold text-purple-600">{relationships.length}</div>
            <div className="text-sm text-slate-600">Partner Communities</div>
          </AnimatedCard>

          {/* Recent Activity */}
          <div className="md:col-span-2 lg:col-span-4">
            <AnimatedCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              {applications.slice(0, 5).length > 0 ? (
                <div className="space-y-3">
                  {applications.slice(0, 5).map(app => (
                    <div key={app.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getImpactIcon(app.community_content.type)}</span>
                        <div>
                          <div className="font-medium">{app.community_content.title}</div>
                          <div className="text-sm text-slate-600">
                            {app.community_content.communities.name} • ${app.proposed_amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p>No recent activity</p>
                  <p className="text-sm">Start by exploring sponsorship opportunities</p>
                </div>
              )}
            </AnimatedCard>
          </div>
        </div>
      )}

      {/* Opportunities Tab */}
      {activeTab === 'opportunities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Sponsorship Opportunities</h2>
            <AnimatedButton 
              onClick={() => window.location.reload()}
              variant="ghost"
              size="sm"
            >
              Refresh
            </AnimatedButton>
          </div>

          {opportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map(opportunity => (
                <AnimatedCard key={opportunity.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getImpactIcon(opportunity.type)}</span>
                      <div>
                        <h3 className="font-semibold">{opportunity.title}</h3>
                        <p className="text-sm text-slate-600">{opportunity.communities.name}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(opportunity.status)}`}>
                      {opportunity.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 mb-4 line-clamp-3">
                    {opportunity.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm">
                      <span className="text-slate-600">Goal:</span>
                      <span className="font-bold ml-1">${opportunity.funding_goal.toLocaleString()}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-600">Raised:</span>
                      <span className="font-bold ml-1">${opportunity.current_funding.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(100, (opportunity.current_funding / opportunity.funding_goal) * 100)}%` 
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>👥 {opportunity.communities.member_count} members</span>
                    </div>
                    <AnimatedButton
                      onClick={() => {
                        const amount = prompt('Enter sponsorship amount:')
                        const message = prompt('Add a message (optional):')
                        if (amount && parseFloat(amount) > 0) {
                          handleSponsorshipApplication(
                            opportunity.id, 
                            parseFloat(amount), 
                            message || ''
                          )
                        }
                      }}
                      disabled={isApplying === opportunity.id}
                      size="sm"
                    >
                      {isApplying === opportunity.id ? 'Applying...' : 'Sponsor'}
                    </AnimatedButton>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          ) : (
            <AnimatedCard className="p-12 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">No Opportunities Available</h3>
              <p className="text-slate-600 mb-4">
                Check back later for new sponsorship opportunities or explore communities to find needs.
              </p>
              <Link href="/communities">
                <AnimatedButton>Explore Communities</AnimatedButton>
              </Link>
            </AnimatedCard>
          )}
        </div>
      )}

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">My Applications</h2>

          {applications.length > 0 ? (
            <div className="space-y-4">
              {applications.map(app => (
                <AnimatedCard key={app.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getImpactIcon(app.community_content.type)}</span>
                      <div>
                        <h3 className="font-semibold">{app.community_content.title}</h3>
                        <p className="text-sm text-slate-600">{app.community_content.communities.name}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-slate-600">Proposed Amount:</span>
                      <div className="font-bold text-lg">${app.proposed_amount.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Applied:</span>
                      <div className="font-medium">{new Date(app.created_at).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Expires:</span>
                      <div className="font-medium">{new Date(app.expires_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {app.message && (
                    <div className="mb-4">
                      <span className="text-sm text-slate-600">Message:</span>
                      <p className="text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-lg mt-1">
                        {app.message}
                      </p>
                    </div>
                  )}

                  {app.community_response && (
                    <div className="border-t pt-4">
                      <span className="text-sm text-slate-600">Community Response:</span>
                      <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-1">
                        {app.community_response}
                      </p>
                    </div>
                  )}
                </AnimatedCard>
              ))}
            </div>
          ) : (
            <AnimatedCard className="p-12 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
              <p className="text-slate-600 mb-4">
                Start by exploring sponsorship opportunities and applying to sponsor community needs.
              </p>
              <AnimatedButton onClick={() => setActiveTab('opportunities')}>
                View Opportunities
              </AnimatedButton>
            </AnimatedCard>
          )}
        </div>
      )}

      {/* Impact Tab */}
      {activeTab === 'impact' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Your Impact</h2>

          {sponsorships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sponsorships.map(sponsorship => (
                <AnimatedCard key={sponsorship.id} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{getImpactIcon(sponsorship.community_content.type)}</span>
                    <div>
                      <h3 className="font-semibold">{sponsorship.community_content.title}</h3>
                      <p className="text-sm text-slate-600">{sponsorship.community_content.communities.name}</p>
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-green-600">${sponsorship.amount.toLocaleString()}</div>
                    <div className="text-sm text-slate-600">Sponsored</div>
                  </div>

                  <div className="text-sm text-slate-600 text-center">
                    Funded on {new Date(sponsorship.created_at).toLocaleDateString()}
                  </div>

                  {sponsorship.community_content.status === 'completed' && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <span className="text-green-600 font-medium">✅ Project Completed</span>
                    </div>
                  )}
                </AnimatedCard>
              ))}
            </div>
          ) : (
            <AnimatedCard className="p-12 text-center">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-xl font-semibold mb-2">No Impact Yet</h3>
              <p className="text-slate-600 mb-4">
                Your sponsored projects will appear here once they're funded and completed.
              </p>
              <AnimatedButton onClick={() => setActiveTab('opportunities')}>
                Start Sponsoring
              </AnimatedButton>
            </AnimatedCard>
          )}
        </div>
      )}
    </div>
  )
}
