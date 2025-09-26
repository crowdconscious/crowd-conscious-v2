import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-server'
import { AnimatedCard, CommunityCardSkeleton } from '@/components/ui/UIComponents'
import DiscoverFilters from './DiscoverFilters'
import Link from 'next/link'

async function getTrendingCommunities() {
  // Get communities with recent activity and high engagement
  const { data, error } = await supabase
    .from('communities')
    .select(`
      id, name, description, image_url, logo_url, member_count, core_values, created_at, address,
      community_content!inner(created_at, type)
    `)
    .gte('community_content.created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    .order('member_count', { ascending: false })
    .limit(8)

  if (error) {
    console.error('Error fetching trending communities:', error)
    return []
  }

  // Calculate activity score and sort by it
  const communitiesWithActivity = (data || []).map(community => {
    const recentContent = community.community_content?.length || 0
    const activityScore = (community.member_count * 0.7) + (recentContent * 0.3)
    return { ...community, activityScore, recentContent }
  })

  return communitiesWithActivity.sort((a, b) => b.activityScore - a.activityScore)
}

async function getNewCommunities() {
  const { data, error } = await supabase
    .from('communities')
    .select('id, name, description, image_url, logo_url, member_count, core_values, created_at, address')
    .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) // Last 14 days
    .order('created_at', { ascending: false })
    .limit(6)

  return error ? [] : data || []
}

async function getFeaturedCommunities() {
  // Communities with highest engagement and positive impact
  const { data, error } = await supabase
    .from('communities')
    .select('id, name, description, image_url, logo_url, member_count, core_values, created_at, address')
    .gte('member_count', 10) // At least 10 members
    .order('member_count', { ascending: false })
    .limit(4)

  return error ? [] : data || []
}

export default async function DiscoverPage() {
  const user = await getCurrentUser()
  
  const [trendingCommunities, newCommunities, featuredCommunities] = await Promise.all([
    getTrendingCommunities(),
    getNewCommunities(),
    getFeaturedCommunities()
  ])

  return (
    <div className="space-y-12">
      {/* Discover Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white rounded-xl p-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
            Discover Communities
          </h1>
          <p className="text-xl text-purple-100 mb-6">
            Find communities that match your passions and create meaningful impact together
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">{trendingCommunities.length + newCommunities.length + featuredCommunities.length}</div>
              <div className="text-purple-200 text-sm">Active Communities</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">{trendingCommunities.reduce((sum, c) => sum + c.member_count, 0)}</div>
              <div className="text-purple-200 text-sm">Community Members</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">{trendingCommunities.reduce((sum, c) => sum + (c as any).recentContent, 0)}</div>
              <div className="text-purple-200 text-sm">Recent Activities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <DiscoverFilters />

      {/* Trending Communities */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">🔥 Trending Communities</h2>
            <p className="text-slate-600">Most active communities this month</p>
          </div>
          <Link
            href="/communities"
            className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trendingCommunities.map((community) => (
            <AnimatedCard key={community.id} hover>
              <Link href={`/communities/${community.id}`}>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
                  {/* Community Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center">
                        {community.logo_url ? (
                          <img
                            src={community.logo_url}
                            alt={community.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {community.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Trending Badge */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-xs">🔥</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{community.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{community.member_count} members</span>
                        <span>•</span>
                        <span>{(community as any).recentContent || 0} recent posts</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {community.description || 'Building community impact together.'}
                  </p>

                  {/* Core Values */}
                  {community.core_values?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {community.core_values.slice(0, 2).map((value, index) => {
                        const getValueColor = (val: string) => {
                          const lowerVal = val.toLowerCase()
                          if (lowerVal.includes('air') || lowerVal.includes('climate')) return 'bg-sky-100 text-sky-700'
                          if (lowerVal.includes('water') || lowerVal.includes('ocean')) return 'bg-blue-100 text-blue-700'
                          if (lowerVal.includes('waste') || lowerVal.includes('recycle')) return 'bg-amber-100 text-amber-700'
                          if (lowerVal.includes('city') || lowerVal.includes('safety')) return 'bg-pink-100 text-pink-700'
                          return 'bg-purple-100 text-purple-700'
                        }
                        
                        return (
                          <span 
                            key={index}
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getValueColor(value)}`}
                          >
                            {value}
                          </span>
                        )
                      })}
                      {community.core_values.length > 2 && (
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
                          +{community.core_values.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {community.address && (
                    <p className="text-slate-500 text-xs flex items-center gap-1 mb-3">
                      <span>📍</span>
                      {community.address}
                    </p>
                  )}

                  {/* Activity Score */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <span>Activity Score: {Math.round((community as any).activityScore)}</span>
                    <span>Join Community →</span>
                  </div>
                </div>
              </Link>
            </AnimatedCard>
          ))}
        </div>
      </section>

      {/* New Communities */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">✨ New Communities</h2>
            <p className="text-slate-600">Recently launched communities</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newCommunities.map((community) => (
            <AnimatedCard key={community.id} hover>
              <Link href={`/communities/${community.id}`}>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-green-500 rounded-full flex items-center justify-center">
                        {community.logo_url ? (
                          <img
                            src={community.logo_url}
                            alt={community.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {community.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* New Badge */}
                      <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">
                        NEW
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{community.name}</h3>
                      <div className="text-sm text-slate-500">
                        {community.member_count} members • Created {new Date(community.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {community.description || 'A new community ready to make impact.'}
                  </p>

                  {community.core_values?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {community.core_values.slice(0, 3).map((value, index) => (
                        <span 
                          key={index}
                          className="text-xs px-2 py-1 bg-teal-100 text-teal-700 rounded-full font-medium"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </AnimatedCard>
          ))}
        </div>
      </section>

      {/* Featured Communities */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">⭐ Featured Communities</h2>
            <p className="text-slate-600">Communities making the biggest impact</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCommunities.map((community) => (
            <AnimatedCard key={community.id} hover>
              <Link href={`/communities/${community.id}`}>
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200 p-6 h-full relative overflow-hidden">
                  {/* Featured Badge */}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded-full font-medium">
                    FEATURED
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      {community.logo_url ? (
                        <img
                          src={community.logo_url}
                          alt={community.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {community.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{community.name}</h3>
                      <div className="text-sm text-orange-700 font-medium">
                        {community.member_count} members
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-700 text-sm">
                    {community.description || 'Making exceptional community impact.'}
                  </p>
                </div>
              </Link>
            </AnimatedCard>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-xl p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Make an Impact?</h2>
        <p className="text-xl text-teal-100 mb-6 max-w-2xl mx-auto">
          Join a community that matches your values or create your own to start making a difference today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/communities"
            className="bg-white text-teal-600 hover:bg-teal-50 font-semibold py-3 px-8 rounded-xl transition-colors"
          >
            Browse All Communities
          </Link>
          <Link
            href="/communities/new"
            className="bg-teal-700 hover:bg-teal-800 border border-white/20 font-semibold py-3 px-8 rounded-xl transition-colors"
          >
            Start Your Community
          </Link>
        </div>
      </section>
    </div>
  )
}
