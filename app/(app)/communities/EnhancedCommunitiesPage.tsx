'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  ImpactBadge,
  Badge,
  cn
} from '../../components/ui'

interface Community {
  id: string
  name: string
  description: string | null
  address: string | null
  core_values: string[]
  member_count: number
  created_at: string
  image_url?: string | null
}

interface EnhancedCommunitiesPageProps {
  communities: Community[]
  currentUser: any
}

export default function EnhancedCommunitiesPage({ 
  communities, 
  currentUser 
}: EnhancedCommunitiesPageProps) {
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'alphabetical'>('newest')

  // Map core values to impact types
  const getImpactType = (value: string): 'clean-air' | 'clean-water' | 'safe-cities' | 'zero-waste' | 'fair-trade' => {
    const lowerValue = value.toLowerCase()
    if (lowerValue.includes('air') || lowerValue.includes('climate')) return 'clean-air'
    if (lowerValue.includes('water') || lowerValue.includes('ocean')) return 'clean-water'
    if (lowerValue.includes('city') || lowerValue.includes('safety') || lowerValue.includes('urban')) return 'safe-cities'
    if (lowerValue.includes('waste') || lowerValue.includes('recycle') || lowerValue.includes('circular')) return 'zero-waste'
    if (lowerValue.includes('trade') || lowerValue.includes('social') || lowerValue.includes('economic')) return 'fair-trade'
    return 'clean-air' // default
  }

  // Filter and sort communities
  const filteredCommunities = communities
    .filter(community => {
      if (filter === 'all') return true
      return community.core_values.some(value => 
        getImpactType(value) === filter
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'popular':
          return b.member_count - a.member_count
        case 'alphabetical':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

  const impactTypes = [
    { key: 'all', label: 'All Communities', icon: '🌍' },
    { key: 'clean-air', label: 'Clean Air', icon: '🌱' },
    { key: 'clean-water', label: 'Clean Water', icon: '💧' },
    { key: 'safe-cities', label: 'Safe Cities', icon: '🏙️' },
    { key: 'zero-waste', label: 'Zero Waste', icon: '♻️' },
    { key: 'fair-trade', label: 'Fair Trade', icon: '🤝' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-purple-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-teal-100 bg-clip-text text-transparent">
              Discover Communities
            </h1>
            <p className="text-xl text-teal-100 max-w-3xl mx-auto">
              Join thousands of changemakers creating measurable impact through transparent 
              governance and collaborative action in their local communities.
            </p>
          </div>
          
          <div className="flex justify-center">
            <Link href="/communities/new">
              <Button 
                variant="secondary" 
                size="lg"
                className="bg-white/20 border border-white/30 text-white hover:bg-white/30 min-w-[200px]"
                leftIcon="✨"
              >
                Start Your Community
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Filters and Sorting */}
        <div className="flex flex-col lg:flex-row gap-6 mb-12">
          {/* Impact Type Filters */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4 uppercase tracking-wide">
              Filter by Impact Area
            </h3>
            <div className="flex flex-wrap gap-3">
              {impactTypes.map(type => (
                <button
                  key={type.key}
                  onClick={() => setFilter(type.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                    filter === type.key
                      ? 'bg-primary-600 text-white shadow-md scale-105'
                      : 'bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-700'
                  )}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                  <Badge variant="secondary" size="sm">
                    {type.key === 'all' ? communities.length : 
                     communities.filter(c => c.core_values.some(v => getImpactType(v) === type.key)).length}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Sort Control */}
          <div className="lg:w-64">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4 uppercase tracking-wide">
              Sort By
            </h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Members</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>
        </div>

        {/* Communities Grid */}
        {filteredCommunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCommunities.map((community) => (
              <CommunityCard 
                key={community.id} 
                community={community}
                getImpactType={getImpactType}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">🌱</div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              {filter === 'all' ? 'No communities yet' : `No ${impactTypes.find(t => t.key === filter)?.label} communities`}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
              {filter === 'all' 
                ? 'Be the first to create a community and start making impact!'
                : 'Be the first to create a community focused on this impact area!'
              }
            </p>
            <Link href="/communities/new">
              <Button variant="primary" size="lg" leftIcon="🚀">
                Create First Community
              </Button>
            </Link>
          </div>
        )}

        {/* Getting Started Section */}
        <Card className="mt-20 bg-gradient-to-r from-teal-500/10 to-purple-500/10 border-primary-200 dark:border-primary-800">
          <CardHeader>
            <CardTitle className="text-center text-2xl">🚀 Ready to Make Impact?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white/50 dark:bg-neutral-800/50 rounded-xl backdrop-blur-sm">
                <div className="text-4xl mb-4">🏙️</div>
                <h4 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 mb-2">
                  Find Local Groups
                </h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                  Browse communities in your area working on causes you care about
                </p>
              </div>
              
              <div className="text-center p-6 bg-white/50 dark:bg-neutral-800/50 rounded-xl backdrop-blur-sm">
                <div className="text-4xl mb-4">🤝</div>
                <h4 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 mb-2">
                  Join & Participate
                </h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                  Become a member, vote on initiatives, and help shape your community's future
                </p>
              </div>
              
              <div className="text-center p-6 bg-white/50 dark:bg-neutral-800/50 rounded-xl backdrop-blur-sm">
                <div className="text-4xl mb-4">💡</div>
                <h4 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 mb-2">
                  Propose Ideas
                </h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                  Submit needs, organize events, and get community funding for your projects
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CommunityCard({ 
  community, 
  getImpactType 
}: { 
  community: Community
  getImpactType: (value: string) => 'clean-air' | 'clean-water' | 'safe-cities' | 'zero-waste' | 'fair-trade'
}) {
  return (
    <Link href={`/communities/${community.id}`}>
      <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden h-full">
        {/* Community Image or Gradient */}
        <div className="h-48 bg-gradient-to-br from-teal-400 via-teal-500 to-purple-500 relative overflow-hidden">
          {community.image_url ? (
            <img
              src={community.image_url}
              alt={community.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold bg-gradient-to-br from-teal-500 to-purple-600">
              {community.name[0].toUpperCase()}
            </div>
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
          
          {/* Member Count Badge */}
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-semibold">
            {community.member_count} member{community.member_count !== 1 ? 's' : ''}
          </div>
        </div>

        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-primary-600 transition-colors">
              {community.name}
            </h3>
            
            {community.address && (
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-3 flex items-center gap-1">
                <span>📍</span>
                {community.address}
              </p>
            )}
            
            <p className="text-neutral-600 dark:text-neutral-300 text-sm line-clamp-3 mb-4">
              {community.description || 'Building community impact together through collaborative action and transparent governance.'}
            </p>

            {/* Core Values as Impact Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {community.core_values.slice(0, 3).map((value, index) => (
                <ImpactBadge
                  key={index}
                  impact={getImpactType(value)}
                  className="text-xs"
                >
                  {value}
                </ImpactBadge>
              ))}
              {community.core_values.length > 3 && (
                <Badge variant="secondary" size="sm">
                  +{community.core_values.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
            <span className="text-primary-600 dark:text-primary-400 font-medium group-hover:text-primary-700 dark:group-hover:text-primary-300">
              Explore →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
