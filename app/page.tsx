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
const Footer = dynamic(() => import('../components/Footer'))
const CookieConsent = dynamic(() => import('../components/CookieConsent'))

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
      .order('member_count', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching communities:', error)
      return []
    }

    // Add recent activity for each community
    const communitiesWithActivity = await Promise.all(
      (data || []).map(async (community) => {
        const { data: contentData } = await supabase
          .from('community_content')
          .select('type')
          .eq('community_id', community.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

        return {
          ...community,
          recent_activity: {
            type: 'content',
            count: contentData?.length || 0
          }
        }
      })
    )

    return communitiesWithActivity
  } catch (error) {
    console.error('Database connection error:', error)
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

    return (data || []).map(item => ({
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
    // Get total funding
    const { data: fundingData } = await supabase
      .from('community_content')
      .select('current_funding')
      .eq('type', 'need')
      .not('current_funding', 'is', null)

    const totalFundsRaised = fundingData?.reduce((sum, item) => sum + (item.current_funding || 0), 0) || 0

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

    return {
      total_funds_raised: totalFundsRaised,
      active_communities: activeCommunities || 0,
      needs_fulfilled: needsFulfilled || 0,
      total_members: totalMembers || 0
    }
  } catch (error) {
    console.error('Error fetching impact stats:', error)
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
