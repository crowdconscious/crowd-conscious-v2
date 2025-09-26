'use client'

import { useState } from 'react'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'

interface ImpactData {
  community: {
    name: string
    member_count: number
  }
  impactMetrics: Array<{
    id: string
    metric_type: string
    value: number
    unit: string
    verified: boolean
    created_at: string
    community_content: {
      id: string
      title: string
      type: string
      current_funding: number
      funding_goal: number
    }
  }>
  members: Array<{
    user_id: string
    role: string
    voting_power: number
    joined_at: string
    profiles: {
      id: string
      full_name: string
      email: string
      avatar_url: string | null
    }
  }>
  completedContent: Array<{
    id: string
    title: string
    type: string
    current_funding: number
    funding_goal: number
    status: string
    created_at: string
    created_by: string
    profiles: {
      full_name: string
      email: string
    }
  }>
  sponsorships: Array<{
    id: string
    amount: number
    status: string
    created_at: string
    sponsor_id: string
    profiles: {
      full_name: string
      email: string
      user_type: string
      avatar_url: string | null
    }
    community_content: {
      id: string
      title: string
      type: string
    }
  }>
}

interface ImpactDistributionClientProps {
  communityId: string
  user: any
  impactData: ImpactData
}

export default function ImpactDistributionClient({ 
  communityId, 
  user, 
  impactData 
}: ImpactDistributionClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'distribution' | 'sponsors'>('overview')

  // Calculate impact distribution
  const calculateImpactDistribution = () => {
    const totalVotingPower = impactData.members.reduce((sum, member) => sum + member.voting_power, 0)
    const totalFunding = impactData.completedContent.reduce((sum, content) => sum + content.current_funding, 0)
    
    return impactData.members.map(member => {
      const impactShare = totalVotingPower > 0 ? (member.voting_power / totalVotingPower) * 100 : 0
      const fundingShare = totalVotingPower > 0 ? (member.voting_power / totalVotingPower) * totalFunding : 0
      
      return {
        ...member,
        impactShare,
        fundingShare
      }
    }).sort((a, b) => b.impactShare - a.impactShare)
  }

  // Get impact metrics by type
  const getImpactByType = () => {
    const metricTypes = ['clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade']
    return metricTypes.map(type => {
      const metrics = impactData.impactMetrics.filter(m => m.metric_type === type)
      const totalValue = metrics.reduce((sum, m) => sum + m.value, 0)
      const verifiedValue = metrics.filter(m => m.verified).reduce((sum, m) => sum + m.value, 0)
      
      return {
        type,
        total: totalValue,
        verified: verifiedValue,
        count: metrics.length,
        name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }
    }).filter(type => type.total > 0)
  }

  const distributionData = calculateImpactDistribution()
  const impactByType = getImpactByType()
  const totalFunding = impactData.completedContent.reduce((sum, content) => sum + content.current_funding, 0)
  const totalSponsored = impactData.sponsorships.reduce((sum, s) => sum + s.amount, 0)

  const getImpactIcon = (type: string) => {
    const icons = {
      clean_air: '🌬️',
      clean_water: '💧',
      safe_cities: '🏙️',
      zero_waste: '♻️',
      fair_trade: '🤝'
    }
    return icons[type as keyof typeof icons] || '🌱'
  }

  const getRoleIcon = (role: string) => {
    const icons = {
      founder: '👑',
      admin: '⭐',
      member: '👤'
    }
    return icons[role as keyof typeof icons] || '👤'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-2">{impactData.community.name} Impact Dashboard</h1>
        <p className="text-teal-100">
          Track community impact distribution and member contributions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'distribution', label: 'Distribution', icon: '📈' },
          { key: 'sponsors', label: 'Sponsors', icon: '🤝' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-slate-600 hover:text-teal-600'
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
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-teal-600">{impactData.community.member_count}</div>
            <div className="text-sm text-slate-600">Active Members</div>
          </AnimatedCard>

          <AnimatedCard className="p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-green-600">{impactData.completedContent.length}</div>
            <div className="text-sm text-slate-600">Completed Projects</div>
          </AnimatedCard>

          <AnimatedCard className="p-6 text-center">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold text-blue-600">${totalFunding.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Total Funding</div>
          </AnimatedCard>

          <AnimatedCard className="p-6 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-purple-600">{impactData.impactMetrics.length}</div>
            <div className="text-sm text-slate-600">Impact Metrics</div>
          </AnimatedCard>

          {/* Impact by Type */}
          <div className="md:col-span-2 lg:col-span-4">
            <AnimatedCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">Impact by Category</h3>
              {impactByType.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {impactByType.map(type => (
                    <div key={type.type} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getImpactIcon(type.type)}</span>
                        <span className="font-medium">{type.name}</span>
                      </div>
                      <div className="text-2xl font-bold text-teal-600">{type.total}</div>
                      <div className="text-sm text-slate-600">
                        {type.verified} verified · {type.count} metrics
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No impact metrics recorded yet</p>
                  <p className="text-sm">Complete projects to start tracking impact</p>
                </div>
              )}
            </AnimatedCard>
          </div>
        </div>
      )}

      {/* Distribution Tab */}
      {activeTab === 'distribution' && (
        <div className="space-y-6">
          <AnimatedCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Impact Distribution by Member</h3>
            <div className="text-sm text-slate-600 mb-6">
              Impact is distributed based on voting power: Founders (3x), Admins (2x), Members (1x)
            </div>
            
            {distributionData.length > 0 ? (
              <div className="space-y-4">
                {distributionData.map(member => (
                  <div key={member.user_id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span>{getRoleIcon(member.role)}</span>
                        {member.profiles.avatar_url ? (
                          <img 
                            src={member.profiles.avatar_url} 
                            alt={member.profiles.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                            <span className="text-teal-600 font-medium">
                              {member.profiles.full_name?.[0] || member.profiles.email[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{member.profiles.full_name || member.profiles.email}</div>
                        <div className="text-sm text-slate-600 capitalize">{member.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-teal-600">{member.impactShare.toFixed(1)}%</div>
                      <div className="text-sm text-slate-600">
                        ${member.fundingShare.toFixed(0)} impact value
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">
                <div className="text-4xl mb-2">👥</div>
                <p>No members found</p>
              </div>
            )}
          </AnimatedCard>
        </div>
      )}

      {/* Sponsors Tab */}
      {activeTab === 'sponsors' && (
        <div className="space-y-6">
          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Community Sponsors</h3>
              <div className="text-sm text-slate-600">
                Total Sponsored: <span className="font-bold text-green-600">${totalSponsored.toLocaleString()}</span>
              </div>
            </div>
            
            {impactData.sponsorships.length > 0 ? (
              <div className="space-y-4">
                {impactData.sponsorships.map(sponsorship => (
                  <div key={sponsorship.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {sponsorship.profiles.avatar_url ? (
                        <img 
                          src={sponsorship.profiles.avatar_url} 
                          alt={sponsorship.profiles.full_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 text-xl">🏢</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{sponsorship.profiles.full_name}</div>
                        <div className="text-sm text-slate-600">
                          Sponsored: {sponsorship.community_content.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(sponsorship.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${sponsorship.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-600 capitalize">
                        {sponsorship.community_content.type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">
                <div className="text-4xl mb-2">🤝</div>
                <p>No sponsors yet</p>
                <p className="text-sm">Create needs to attract brand sponsorships</p>
              </div>
            )}
          </AnimatedCard>
        </div>
      )}
    </div>
  )
}
