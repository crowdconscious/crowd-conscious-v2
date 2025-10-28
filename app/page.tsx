import { supabase } from '../lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamic imports for client components (without ssr: false for Next.js 15 compatibility)
const Navigation = dynamic(() => import('./components/Navigation'))
const AnimatedHero = dynamic(() => import('./components/landing/AnimatedHero'))
const CommunityCarousel = dynamic(() => import('./components/landing/CommunityCarousel'))
const ImpactCounters = dynamic(() => import('./components/landing/ImpactCounters'))
const CompletedNeeds = dynamic(() => import('./components/landing/CompletedNeeds'))
const SocialProof = dynamic(() => import('./components/landing/SocialProof'))
const TrustedBrands = dynamic(() => import('../components/TrustedBrands'))
const Footer = dynamic(() => import('../components/Footer'))
const CookieConsent = dynamic(() => import('../components/CookieConsent'))

// Revalidate this page every 60 seconds to show fresh data
export const revalidate = 60

interface Community {
  id: string
  name: string
  description: string | null
  image_url: string | null
  member_count: number
  address: string | null
  core_values: string[]
  created_at: string
  recent_activity?: {
    type: string
    count: number
  }
}

interface CompletedNeed {
  id: string
  title: string
  description: string | null
  image_url: string | null
  funding_goal: number
  current_funding: number
  completion_date: string
  community_name: string
}

interface ImpactStats {
  total_funds_raised: number
  active_communities: number
  needs_fulfilled: number
  total_members: number
}

async function getEnhancedCommunities(): Promise<Community[]> {
  try {
    console.log('🔍 Fetching communities for landing page...')
    
    const { data, error } = await supabase
      .from('communities')
      .select(`
        id, 
        name, 
        description, 
        image_url,
        member_count, 
        address, 
        core_values,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) {
      console.error('❌ Error fetching communities:', error)
      return []
    }

    console.log(`✅ Found ${data?.length || 0} communities`)

    if (!data || data.length === 0) {
      console.log('📝 No communities found in database')
      return []
    }

    // Add recent activity for each community
    const communitiesWithActivity = await Promise.all(
      (data || []).map(async (community) => {
        const { data: contentData } = await supabase
          .from('community_content')
          .select('type')
          .eq('community_id', (community as any).id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

        return {
          ...(community as any),
          recent_activity: {
            type: 'content',
            count: contentData?.length || 0
          }
        }
      })
    )

    console.log('🎯 Communities with activity:', communitiesWithActivity.map(c => ({ name: c.name, activity: c.recent_activity?.count })))
    return communitiesWithActivity
  } catch (error) {
    console.error('💥 Database connection error:', error)
    return []
  }
}

async function getCompletedNeeds(): Promise<CompletedNeed[]> {
  try {
    const { data, error } = await supabase
      .from('community_content')
      .select(`
        id,
        title,
        description,
        image_url,
        funding_goal,
        current_funding,
        created_at,
        communities (name)
      `)
      .eq('type', 'need')
      .eq('status', 'completed')
      .not('funding_goal', 'is', null)
      .order('created_at', { ascending: false })
      .limit(6)

    if (error) {
      console.error('Error fetching completed needs:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      funding_goal: item.funding_goal || 0,
      current_funding: item.current_funding,
      completion_date: item.created_at,
      community_name: (item.communities as any)?.name || 'Unknown Community'
    }))
  } catch (error) {
    console.error('Error fetching completed needs:', error)
    return []
  }
}

async function getImpactStats(): Promise<ImpactStats> {
  try {
    console.log('📊 Fetching impact stats for landing page...')
    
    // Get total funding
    const { data: fundingData } = await supabase
      .from('community_content')
      .select('current_funding')
      .eq('type', 'need')
      .not('current_funding', 'is', null)

    const totalFundsRaised = fundingData?.reduce((sum, item: any) => sum + (item.current_funding || 0), 0) || 0

    // Get active communities count
    const { count: activeCommunities } = await supabase
      .from('communities')
      .select('*', { count: 'exact', head: true })

    // Get fulfilled needs count
    const { count: needsFulfilled } = await supabase
      .from('community_content')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'need')
      .eq('status', 'completed')

    // Get total members
    const { count: totalMembers } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })

    // Get total users (for broader impact)
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const stats = {
      total_funds_raised: totalFundsRaised,
      active_communities: activeCommunities || 0,
      needs_fulfilled: needsFulfilled || 0,
      total_members: totalMembers || totalUsers || 0 // Fallback to total users if no members
    }

    console.log('✅ Impact stats:', stats)
    return stats
  } catch (error) {
    console.error('❌ Error fetching impact stats:', error)
    return {
      total_funds_raised: 0,
      active_communities: 0,
      needs_fulfilled: 0,
      total_members: 0
    }
  }
}

export default async function LandingPage() {
  // Fetch all data server-side for SEO
  const [communities, completedNeeds, impactStats] = await Promise.all([
    getEnhancedCommunities(),
    getCompletedNeeds(),
    getImpactStats()
  ])

  return (
    <div className="min-h-screen overflow-x-hidden">
      <main>
        {/* Navigation */}
        <Navigation />
      
      {/* Animated Hero Section */}
      <AnimatedHero impactStats={impactStats} />

      {/* Live Impact Counters */}
      <ImpactCounters stats={impactStats} />

      {/* Active Communities Carousel */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Active Communities
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Join thousands of changemakers building a more sustainable future, one community at a time
            </p>
          </div>
          <CommunityCarousel communities={communities} />
        </div>
      </section>

      {/* Recent Impact Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Recent Impact
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              See how communities are creating real change with transparent funding and measurable outcomes
            </p>
          </div>
          <CompletedNeeds needs={completedNeeds} />
        </div>
      </section>

      {/* Social Proof & Stats */}
      <SocialProof stats={impactStats} />

      {/* Trusted Brands Section */}
      <TrustedBrands />

      {/* Corporate Training Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-purple-900 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              <div className="inline-block bg-gradient-to-r from-teal-400 to-purple-400 text-slate-900 text-sm font-bold px-4 py-2 rounded-full mb-6">
                Para Empresas 🏢
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Concientizaciones
              </h2>
              <p className="text-xl text-slate-300 mb-6">
                Transforma a tus empleados en agentes de cambio. Programas corporativos de capacitación que generan impacto medible en tu empresa y comunidad.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-teal-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Capacitación Story-Driven</h3>
                    <p className="text-slate-400">Módulos narrativos que enganchan y educan</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-teal-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold">ROI Medible</h3>
                    <p className="text-slate-400">Ahorro real en energía, agua y residuos</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-teal-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Certificación ESG</h3>
                    <p className="text-slate-400">Cumple con estándares ambientales</p>
                  </div>
                </div>
              </div>

              <Link 
                href="/concientizaciones" 
                className="inline-block bg-gradient-to-r from-teal-500 to-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-xl"
              >
                Descubre Concientizaciones →
              </Link>
            </div>

            {/* Right: Stats/Features */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Impacto Empresarial</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/20 rounded-xl p-6 border border-teal-400/30">
                  <div className="text-4xl font-bold text-teal-300 mb-2">$125K</div>
                  <div className="text-sm text-slate-300">Ahorro promedio anual</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-6 border border-purple-400/30">
                  <div className="text-4xl font-bold text-purple-300 mb-2">6</div>
                  <div className="text-sm text-slate-300">Módulos especializados</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-6 border border-blue-400/30">
                  <div className="text-4xl font-bold text-blue-300 mb-2">100+</div>
                  <div className="text-sm text-slate-300">Empleados por programa</div>
                </div>

                <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-xl p-6 border border-pink-400/30">
                  <div className="text-4xl font-bold text-pink-300 mb-2">75%</div>
                  <div className="text-sm text-slate-300">Tasa de certificación</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-teal-500/10 to-purple-500/10 border border-teal-400/20 rounded-lg">
                <p className="text-sm text-slate-300 text-center">
                  🎁 <strong className="text-white">Módulo de prueba gratis</strong> - Sin compromiso
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-teal-600 via-teal-700 to-purple-700">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Create Impact?
          </h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Join the movement of communities creating measurable change through transparent governance and collaborative action.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link 
              href="/signup" 
              className="w-full sm:w-auto bg-white text-teal-700 font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl min-w-[200px] shadow-xl"
            >
              Start a Community
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto border-2 border-white text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:bg-white hover:text-teal-700 hover:scale-105 min-w-[200px]"
            >
              Join Existing Community
            </Link>
          </div>
        </div>
      </section>
      </main>

    {/* Footer */}
    <Footer />

    {/* Cookie Consent Banner */}
    <CookieConsent />
  </div>
  )
}
