import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface CommunityNeed {
  id: string
  title: string
  description: string | null
  image_url: string | null
  funding_goal: number
  current_funding: number
  status: string
  created_at: string
  communities: {
    id: string
    name: string
    image_url: string | null
  } | null
}

interface MarketplaceModule {
  id: string
  title: string
  description: string
  thumbnail_url: string | null
  base_price_mxn: number
  creator_name: string
  core_value: string
  difficulty_level: string
  avg_rating: number | null
  enrollment_count: number
}

async function getAllNeeds(): Promise<CommunityNeed[]> {
  const { data, error } = await supabase
    .from('community_content')
    .select(`
      id,
      title,
      description,
      image_url,
      funding_goal,
      current_funding,
      status,
      created_at,
      communities (
        id,
        name,
        image_url
      )
    `)
    .eq('type', 'need')
    .in('status', ['approved', 'active'])
    .not('funding_goal', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching needs:', error)
    return []
  }

  return (data as any) || []
}

async function getAllModules(): Promise<MarketplaceModule[]> {
  const { data, error } = await supabase
    .from('marketplace_modules')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching modules:', error)
    return []
  }

  return data || []
}

export default async function UnifiedMarketplacePage() {
  const [needs, modules] = await Promise.all([
    getAllNeeds(),
    getAllModules()
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-purple-600 via-teal-600 to-blue-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Impact Marketplace
            </h1>
            <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto mb-8">
              Discover training modules and community needs. Support real change through education and direct sponsorship.
            </p>
            
            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-3">
              <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium border border-white/30">
                🎓 Training Modules
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium border border-white/30">
                💝 Community Needs
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium border border-white/30">
                📊 Measurable Impact
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Training Modules Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">🎓 Training Modules</h2>
              <p className="text-slate-600">Corporate training that funds community projects</p>
            </div>
            <Link
              href="/marketplace"
              className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-2"
            >
              <span>View All</span>
              <span>→</span>
            </Link>
          </div>

          {modules.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-slate-600">No modules available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.slice(0, 6).map((module) => (
                <Link
                  key={module.id}
                  href={`/marketplace/${module.id}`}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                >
                  {/* Module Image */}
                  <div className="aspect-video bg-gradient-to-br from-teal-100 to-purple-100 relative overflow-hidden">
                    {module.thumbnail_url ? (
                      <img src={module.thumbnail_url} alt={module.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-6xl">
                        🎓
                      </div>
                    )}
                    {/* Price Badge */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full font-bold text-slate-900">
                      ${(module.base_price_mxn / 20).toFixed(0)} USD
                    </div>
                  </div>

                  {/* Module Info */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-1 bg-teal-100 text-teal-700 rounded-full">
                        {module.core_value}
                      </span>
                      <span className="text-xs text-slate-500">{module.difficulty_level}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">{module.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">by {module.creator_name}</span>
                      {module.avg_rating && (
                        <span className="text-amber-500">★ {module.avg_rating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Community Needs Section */}
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">💝 Community Needs</h2>
            <p className="text-slate-600">Support local communities through direct sponsorship</p>
          </div>

          {needs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <div className="text-6xl mb-4">💝</div>
              <p className="text-slate-600">No active needs at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {needs.map((need) => {
                const progress = (need.current_funding / need.funding_goal) * 100
                const remaining = need.funding_goal - need.current_funding

                return (
                  <Link
                    key={need.id}
                    href={`/communities/${need.communities?.id}`}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                  >
                    {/* Need Image */}
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
                      {need.image_url ? (
                        <img src={need.image_url} alt={need.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-6xl">
                          💝
                        </div>
                      )}
                      {/* Status Badge */}
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                        {need.status === 'active' ? '🟢 Active' : '✨ New'}
                      </div>
                    </div>

                    {/* Need Info */}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-slate-600">
                          🏘️ {need.communities?.name || 'Community'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                        {need.title}
                      </h3>
                      <p className="text-slate-600 text-sm mb-4 line-clamp-2">{need.description}</p>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">Funded</span>
                          <span className="font-bold text-slate-900">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Funding Info */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-slate-900">
                            ${need.current_funding.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500">
                            of ${need.funding_goal.toLocaleString()} goal
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-purple-600">
                            ${remaining.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500">remaining</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="mt-16 bg-gradient-to-r from-teal-600 to-purple-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Make an Impact?
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
            Whether through training or direct support, every contribution creates measurable change in communities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/corporate/signup"
              className="inline-flex items-center gap-2 bg-white text-teal-700 px-8 py-4 rounded-xl font-bold hover:bg-slate-100 transition-colors"
            >
              <span>🏢</span>
              <span>Corporate Training</span>
            </Link>
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-bold hover:bg-white/30 transition-colors border border-white/30"
            >
              <span>💝</span>
              <span>Sponsor a Need</span>
            </Link>
          </div>
        </section>

        {/* Back Navigation */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/communities"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"
          >
            <span>←</span>
            <span>Back to Communities</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

