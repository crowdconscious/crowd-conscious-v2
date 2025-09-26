import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import BrandDiscoverClient from './BrandDiscoverClient'

async function getBrandDiscoverData() {
  // Get all available sponsorship opportunities (needs)
  const { data: opportunities } = await supabase
    .from('community_content')
    .select(`
      id,
      title,
      description,
      type,
      funding_goal,
      current_funding,
      status,
      created_at,
      image_url,
      communities (
        id,
        name,
        image_url,
        member_count,
        core_values,
        address
      ),
      profiles (
        full_name,
        email
      )
    `)
    .eq('type', 'need')
    .in('status', ['voting', 'approved'])
    .lt('current_funding', 'funding_goal')
    .order('created_at', { ascending: false })

  // Get trending communities (those with most recent activity)
  const { data: trendingCommunities } = await supabase
    .from('communities')
    .select(`
      id,
      name,
      image_url,
      member_count,
      core_values,
      address,
      created_at
    `)
    .order('member_count', { ascending: false })
    .limit(12)

  // Get featured opportunities (highest funding goals or most urgent)
  const { data: featuredOpportunities } = await supabase
    .from('community_content')
    .select(`
      id,
      title,
      description,
      funding_goal,
      current_funding,
      status,
      created_at,
      image_url,
      communities (
        id,
        name,
        image_url,
        member_count,
        core_values
      )
    `)
    .eq('type', 'need')
    .in('status', ['voting', 'approved'])
    .lt('current_funding', 'funding_goal')
    .order('funding_goal', { ascending: false })
    .limit(6)

  // Get impact categories data
  const impactCategories = [
    { 
      id: 'clean_air', 
      name: 'Clean Air', 
      icon: '🌬️', 
      color: 'from-sky-400 to-sky-600',
      description: 'Air quality improvement projects'
    },
    { 
      id: 'clean_water', 
      name: 'Clean Water', 
      icon: '💧', 
      color: 'from-blue-400 to-blue-600',
      description: 'Water conservation and purification'
    },
    { 
      id: 'safe_cities', 
      name: 'Safe Cities', 
      icon: '🏙️', 
      color: 'from-pink-400 to-pink-600',
      description: 'Urban safety and infrastructure'
    },
    { 
      id: 'zero_waste', 
      name: 'Zero Waste', 
      icon: '♻️', 
      color: 'from-amber-400 to-amber-600',
      description: 'Waste reduction and recycling'
    },
    { 
      id: 'fair_trade', 
      name: 'Fair Trade', 
      icon: '🤝', 
      color: 'from-green-400 to-green-600',
      description: 'Ethical business practices'
    }
  ]

  return {
    opportunities: opportunities || [],
    trendingCommunities: trendingCommunities || [],
    featuredOpportunities: featuredOpportunities || [],
    impactCategories
  }
}

export default async function BrandDiscoverPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has brand access (basic check)
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  const discoverData = await getBrandDiscoverData()

  return (
    <BrandDiscoverClient 
      user={user} 
      userType={profile?.user_type || 'user'}
      discoverData={discoverData}
    />
  )
}
