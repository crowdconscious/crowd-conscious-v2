'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'
import { supabaseClient } from '@/lib/supabase-client'

interface Opportunity {
  id: string
  title: string
  description: string
  funding_goal: number
  current_funding: number
  status: string
  created_at: string
  image_url: string | null
  communities: {
    id: string
    name: string
    image_url: string | null
    member_count: number
    core_values: string[]
  }
}

interface Community {
  id: string
  name: string
  image_url: string | null
  member_count: number
  core_values: string[]
  address: string | null
  created_at: string
}

interface ImpactCategory {
  id: string
  name: string
  icon: string
  color: string
  description: string
}

interface BrandDiscoverData {
  opportunities: Opportunity[]
  trendingCommunities: Community[]
  featuredOpportunities: Opportunity[]
  impactCategories: ImpactCategory[]
}

interface BrandDiscoverClientProps {
  user: any
  userType: string
  discoverData: BrandDiscoverData
}

export default function BrandDiscoverClient({ 
  user, 
  userType, 
  discoverData 
}: BrandDiscoverClientProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [sortBy, setSortBy] = useState<'recent' | 'funding' | 'urgent'>('recent')

  const { opportunities, trendingCommunities, featuredOpportunities, impactCategories } = discoverData

  // Filter and sort opportunities
  const filteredOpportunities = opportunities
    .filter(opp => {
      const matchesSearch = searchTerm === '' || 
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.communities.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === '' ||
        opp.communities.core_values.some(value => 
          value.toLowerCase().includes(selectedCategory.toLowerCase())
        )
      
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'funding':
          return b.funding_goal - a.funding_goal
        case 'urgent':
          const aProgress = (a.current_funding / a.funding_goal) * 100
          const bProgress = (b.current_funding / b.funding_goal) * 100
          return aProgress - bProgress // Lower progress = more urgent
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const handleSponsorApplication = async (opportunityId: string) => {
    const amount = prompt('Enter your sponsorship amount ($):')
    const message = prompt('Add a message for the community (optional):')
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      const { error } = await supabaseClient
        .from('sponsorship_applications')
        .insert({
          content_id: opportunityId,
          brand_id: user.id,
          proposed_amount: parseFloat(amount),
          message: message || ''
        })

      if (error) throw error

      alert('Sponsorship application submitted successfully! The community will review it soon.')
      window.location.reload()
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Failed to submit application. Please try again.')
    }
  }

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min(100, (current / goal) * 100)
  }

  const getUrgencyLabel = (current: number, goal: number) => {
    const progress = (current / goal) * 100
    if (progress < 25) return { label: 'Urgent', color: 'text-red-600 bg-red-100' }
    if (progress < 50) return { label: 'High Priority', color: 'text-orange-600 bg-orange-100' }
    if (progress < 75) return { label: 'Medium', color: 'text-yellow-600 bg-yellow-100' }
    return { label: 'Low Priority', color: 'text-green-600 bg-green-100' }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-2">Discover Sponsorship Opportunities</h1>
        <p className="text-blue-100 text-lg">
          Find meaningful community needs to sponsor and create measurable impact
        </p>
        {userType !== 'brand' && (
          <div className="mt-4 p-3 bg-white/20 rounded-lg">
            <p className="text-sm">
              💡 <strong>Tip:</strong> Switch to Brand mode in the header to access full sponsorship features
            </p>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <AnimatedCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search needs or communities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Impact Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {impactCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="recent">Most Recent</option>
              <option value="funding">Highest Funding Goal</option>
              <option value="urgent">Most Urgent</option>
            </select>
          </div>
          <div className="flex items-end">
            <AnimatedButton
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('')
                setSortBy('recent')
              }}
              variant="ghost"
              className="w-full"
            >
              Clear Filters
            </AnimatedButton>
          </div>
        </div>
      </AnimatedCard>

      {/* Featured Opportunities */}
      {featuredOpportunities.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">🌟 Featured Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredOpportunities.slice(0, 3).map(opportunity => {
              const urgency = getUrgencyLabel(opportunity.current_funding, opportunity.funding_goal)
              const progress = getProgressPercentage(opportunity.current_funding, opportunity.funding_goal)
              
              return (
                <AnimatedCard key={opportunity.id} className="p-6 border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">{opportunity.title}</h3>
                      <p className="text-sm text-slate-600">{opportunity.communities.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgency.color}`}>
                      {urgency.label}
                    </span>
                  </div>

                  <p className="text-slate-700 text-sm mb-4 line-clamp-3">{opportunity.description}</p>

                  {/* Funding Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-medium">${opportunity.current_funding.toLocaleString()} / ${opportunity.funding_goal.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Community Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">👥 {opportunity.communities.member_count} members</span>
                    </div>
                    <div className="flex gap-1">
                      {opportunity.communities.core_values.slice(0, 2).map((value, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>

                  <AnimatedButton
                    onClick={() => handleSponsorApplication(opportunity.id)}
                    className="w-full"
                    disabled={userType !== 'brand'}
                  >
                    {userType === 'brand' ? '🤝 Apply to Sponsor' : '🔒 Switch to Brand Mode'}
                  </AnimatedButton>
                </AnimatedCard>
              )
            })}
          </div>
        </div>
      )}

      {/* Impact Categories */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">🎯 Impact Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {impactCategories.map(category => (
            <AnimatedCard 
              key={category.id} 
              className={`p-4 text-center cursor-pointer transition-all ${
                selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? '' : category.id)}
            >
              <div className={`text-3xl mb-2 p-3 bg-gradient-to-br ${category.color} rounded-lg inline-block text-white`}>
                {category.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{category.name}</h3>
              <p className="text-xs text-slate-600">{category.description}</p>
            </AnimatedCard>
          ))}
        </div>
      </div>

      {/* All Opportunities */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          💼 All Opportunities ({filteredOpportunities.length})
        </h2>
        
        {filteredOpportunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOpportunities.map(opportunity => {
              const urgency = getUrgencyLabel(opportunity.current_funding, opportunity.funding_goal)
              const progress = getProgressPercentage(opportunity.current_funding, opportunity.funding_goal)
              
              return (
                <AnimatedCard key={opportunity.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">{opportunity.title}</h3>
                      <p className="text-sm text-slate-600">{opportunity.communities.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgency.color}`}>
                      {urgency.label}
                    </span>
                  </div>

                  {opportunity.image_url && (
                    <img 
                      src={opportunity.image_url} 
                      alt={opportunity.title}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  )}

                  <p className="text-slate-700 text-sm mb-4 line-clamp-2">{opportunity.description}</p>

                  {/* Funding Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Funding Progress</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>${opportunity.current_funding.toLocaleString()} raised</span>
                      <span>${opportunity.funding_goal.toLocaleString()} goal</span>
                    </div>
                  </div>

                  {/* Community Info */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-600">👥 {opportunity.communities.member_count} members</span>
                    <span className="text-xs text-slate-500">
                      {new Date(opportunity.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <AnimatedButton
                    onClick={() => handleSponsorApplication(opportunity.id)}
                    className="w-full"
                    disabled={userType !== 'brand'}
                  >
                    {userType === 'brand' ? '🤝 Apply to Sponsor' : '🔒 Switch to Brand Mode'}
                  </AnimatedButton>
                </AnimatedCard>
              )
            })}
          </div>
        ) : (
          <AnimatedCard className="p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No opportunities found</h3>
            <p className="text-slate-600">Try adjusting your filters or search terms</p>
          </AnimatedCard>
        )}
      </div>
    </div>
  )
}
