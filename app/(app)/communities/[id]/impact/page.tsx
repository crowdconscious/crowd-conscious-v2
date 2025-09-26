import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import DashboardNavigation from '@/components/DashboardNavigation'
import ImpactDistributionClient from './ImpactDistributionClient'

interface CommunityImpactPageProps {
  params: {
    id: string
  }
}

async function getCommunityImpactData(communityId: string) {
  // Get community info
  const { data: community } = await supabase
    .from('communities')
    .select('name, member_count')
    .eq('id', communityId)
    .single()

  // Get impact metrics for this community
  const { data: impactMetrics } = await supabase
    .from('impact_metrics')
    .select(`
      *,
      community_content (
        id,
        title,
        type,
        current_funding,
        funding_goal
      )
    `)
    .eq('community_id', communityId)

  // Get community members for impact distribution
  const { data: members } = await supabase
    .from('community_members')
    .select(`
      user_id,
      role,
      voting_power,
      joined_at,
      profiles (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('community_id', communityId)

  // Get completed content with impact
  const { data: completedContent } = await supabase
    .from('community_content')
    .select(`
      id,
      title,
      type,
      current_funding,
      funding_goal,
      status,
      created_at,
      created_by,
      profiles (
        full_name,
        email
      )
    `)
    .eq('community_id', communityId)
    .eq('status', 'completed')

  // Get sponsorships for this community
  const { data: sponsorships } = await supabase
    .from('sponsorships')
    .select(`
      id,
      amount,
      status,
      created_at,
      sponsor_id,
      profiles (
        full_name,
        email,
        user_type,
        avatar_url
      ),
      community_content (
        id,
        title,
        type
      )
    `)
    .eq('status', 'paid')
    .in('content_id', completedContent?.map(c => c.id) || [])

  return {
    community,
    impactMetrics: impactMetrics || [],
    members: members || [],
    completedContent: completedContent || [],
    sponsorships: sponsorships || []
  }
}

export default async function CommunityImpactPage({ params }: CommunityImpactPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in to view impact data.</div>
  }

  const impactData = await getCommunityImpactData(params.id)

  if (!impactData.community) {
    return <div>Community not found.</div>
  }

  return (
    <div className="space-y-8">
      <DashboardNavigation 
        customBackPath={`/communities/${params.id}`} 
        customBackLabel="Back to Community" 
      />

      <ImpactDistributionClient 
        communityId={params.id}
        user={user}
        impactData={impactData}
      />
    </div>
  )
}
