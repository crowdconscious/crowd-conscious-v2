'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  CommunityCardSkeleton, 
  AnimatedCard, 
  AnimatedButton, 
  EmptyState,
  usePullToRefresh,
  useKeyboardShortcuts
} from '@/components/ui/UIComponents'

interface Community {
  id: string
  name: string
  description: string | null
  address: string | null
  core_values: string[]
  member_count: number
  created_at: string
  image_url?: string | null
  logo_url?: string | null
  banner_url?: string | null
}

interface CommunitiesWithLoadingProps {
  initialCommunities: Community[]
}

export default function CommunitiesWithLoading({ initialCommunities }: CommunitiesWithLoadingProps) {
  const [communities, setCommunities] = useState<Community[]>(initialCommunities)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'cmd+k': () => setShowSearch(true),
    'escape': () => setShowSearch(false),
  })

  // Pull to refresh
  const isRefreshing = usePullToRefresh(async () => {
    setIsLoading(true)
    // Simulate refresh - in real app, refetch data
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  })

  // Filter communities based on search
  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.core_values.some(value => value.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-purple-700 text-white rounded-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="h-12 bg-white/20 rounded animate-pulse w-2/3" />
              <div className="h-4 bg-white/20 rounded animate-pulse w-full" />
              <div className="h-4 bg-white/20 rounded animate-pulse w-4/5" />
            </div>
            <div className="space-y-3">
              <div className="h-12 bg-white/20 rounded-xl animate-pulse w-48" />
              <div className="h-4 bg-white/20 rounded animate-pulse w-32 mx-auto" />
            </div>
          </div>
        </div>

        {/* Communities Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <CommunityCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
        <div className="space-y-8">
        {/* Enhanced Header with Search */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-purple-700 text-white rounded-xl p-8 mb-8 relative overflow-hidden">
          {isRefreshing && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/30">
              <div className="h-full bg-white animate-pulse" />
            </div>
          )}
          
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-teal-100 bg-clip-text text-transparent">
                Discover Communities
              </h1>
              <p className="text-xl text-teal-100 max-w-2xl">
                Join thousands of changemakers creating measurable impact through transparent 
                governance and collaborative action in their local communities.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <AnimatedButton
                onClick={() => router.push('/communities/new')}
                variant="ghost"
                className="bg-white/20 border border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
              >
                ✨ Start Your Community
              </AnimatedButton>
              
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="text-center text-teal-200 text-sm hover:text-white transition-colors"
              >
                {communities.length} communities • Press ⌘K to search
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <input
                type="text"
                placeholder="Search communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Communities Grid */}
        {filteredCommunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCommunities.map((community) => (
              <AnimatedCard key={community.id} hover>
                <Link
                  href={`/communities/${community.id}`}
                  className="block h-full"
                >
                  <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 overflow-hidden h-full flex flex-col">
                    {/* Community Header with Media or Gradient */}
                    <div className="h-32 -m-6 mb-4 relative overflow-hidden">
                      {community.banner_url || community.image_url ? (
                        <img
                          src={community.banner_url || community.image_url || ''}
                          alt={`${community.name} banner`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-400 via-teal-500 to-purple-500" />
                      )}
                      
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                      
                      {/* Member Count Badge */}
                      <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-semibold">
                        {community.member_count} member{community.member_count !== 1 ? 's' : ''}
                      </div>
                      
                      {/* Community Logo or Initial */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {community.logo_url ? (
                          <div className="w-16 h-16 bg-white/90 rounded-full p-2 backdrop-blur-sm">
                            <img
                              src={community.logo_url}
                              alt={`${community.name} logo`}
                              className="w-full h-full object-contain rounded-full"
                            />
                          </div>
                        ) : (
                          <div className="text-white text-4xl font-bold">
                            {community.name[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors">
                          {community.name}
                        </h3>
                        
                        {community.address && (
                          <p className="text-slate-500 text-sm mb-3 flex items-center gap-1">
                            <span>📍</span>
                            {community.address}
                          </p>
                        )}
                        
                        <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                          {community.description || 'Building community impact together through collaborative action and transparent governance.'}
                        </p>

                        {/* Enhanced Core Values */}
                        {community.core_values.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {community.core_values.slice(0, 2).map((value, index) => {
                              const getValueColor = (val: string) => {
                                const lowerVal = val.toLowerCase()
                                if (lowerVal.includes('air') || lowerVal.includes('climate')) return 'bg-sky-100 text-sky-700'
                                if (lowerVal.includes('water') || lowerVal.includes('ocean')) return 'bg-blue-100 text-blue-700'
                                if (lowerVal.includes('waste') || lowerVal.includes('recycle')) return 'bg-amber-100 text-amber-700'
                                if (lowerVal.includes('city') || lowerVal.includes('safety')) return 'bg-pink-100 text-pink-700'
                                return 'bg-teal-100 text-teal-700'
                              }
                              
                              return (
                                <span 
                                  key={index}
                                  className={`text-xs px-3 py-1 rounded-full font-medium ${getValueColor(value)}`}
                                >
                                  {value}
                                </span>
                              )
                            })}
                            {community.core_values.length > 2 && (
                              <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded-full">
                                +{community.core_values.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-200">
                        <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
                        <span className="text-teal-600 font-medium flex items-center gap-1">
                          Explore <span className="transition-transform group-hover:translate-x-1">→</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </AnimatedCard>
            ))}
          </div>
        ) : searchTerm ? (
          <EmptyState
            icon="🔍"
            title="No communities found"
            description={`No communities match "${searchTerm}". Try a different search term or create a new community.`}
            action={{
              label: "Clear Search",
              onClick: () => setSearchTerm('')
            }}
          />
        ) : (
          <EmptyState
            illustration="🌱"
            title="No communities yet"
            description="Be the first to create a community and start making measurable impact in your area!"
            action={{
              label: "Create First Community",
              onClick: () => router.push('/communities/new')
            }}
          />
        )}

        {/* Getting Started Section */}
        <div className="bg-gradient-to-r from-teal-500/10 to-purple-500/10 rounded-xl border border-teal-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">🚀 Ready to Make Impact?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Join the movement of communities creating measurable change through transparent governance and collaborative action.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatedCard className="text-center p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
              <div className="text-4xl mb-4">🏙️</div>
              <div className="font-bold text-lg text-slate-900 mb-2">Find Local Groups</div>
              <div className="text-sm text-slate-600">
                Browse communities in your area working on causes you care about
              </div>
            </AnimatedCard>
            
            <AnimatedCard className="text-center p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
              <div className="text-4xl mb-4">🤝</div>
              <div className="font-bold text-lg text-slate-900 mb-2">Join & Participate</div>
              <div className="text-sm text-slate-600">
                Become a member, vote on initiatives, and help shape your community's future
              </div>
            </AnimatedCard>
            
            <AnimatedCard className="text-center p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
              <div className="text-4xl mb-4">💡</div>
              <div className="font-bold text-lg text-slate-900 mb-2">Propose Ideas</div>
              <div className="text-sm text-slate-600">
                Submit needs, organize events, and get community funding for your projects
              </div>
            </AnimatedCard>
          </div>
        </div>
      </div>

    </>
  )
}
