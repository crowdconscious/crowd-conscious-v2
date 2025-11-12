import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import CommunitiesWithLoading from '@/components/CommunitiesWithLoading'

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
  sponsors?: Array<{
    id: string
    company_name: string
    logo_url: string | null
    total_sponsored: number
    verified_brand: boolean
  }>
  total_sponsored?: number
  active_needs?: number
}

async function getAllCommunities(): Promise<Community[]> {
  // Get communities with basic info
  const { data: communities, error } = await supabase
    .from('communities')
    .select('id, name, description, address, core_values, member_count, created_at, image_url, logo_url, banner_url')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching communities:', error)
    return []
  }

  if (!communities) return []

  const communityIds = communities.map(c => (c as any).id)

  // ✅ FIXED: Batch fetch all relationships and needs in single queries
  // Get all brand relationships for all communities at once
  const { data: allRelationships } = await supabase
    .from('brand_community_relationships')
    .select(`
      community_id,
      total_sponsored,
      profiles (
        id,
        company_name,
        full_name,
        logo_url,
        verified_brand
      )
    `)
    .in('community_id', communityIds)
    .eq('is_active', true)
    .order('total_sponsored', { ascending: false })

  // Get all active needs counts at once
  const { data: allNeeds } = await supabase
    .from('community_content')
    .select('community_id, id')
    .in('community_id', communityIds)
    .eq('type', 'need')
    .in('status', ['voting', 'approved'])

  // Group relationships by community_id
  const relationshipsByCommunity = new Map<string, any[]>()
  allRelationships?.forEach((rel: any) => {
    const communityId = rel.community_id
    if (!relationshipsByCommunity.has(communityId)) {
      relationshipsByCommunity.set(communityId, [])
    }
    relationshipsByCommunity.get(communityId)!.push(rel)
  })

  // Count needs per community
  const needsCountByCommunity = new Map<string, number>()
  allNeeds?.forEach((need: any) => {
    const communityId = need.community_id
    needsCountByCommunity.set(communityId, (needsCountByCommunity.get(communityId) || 0) + 1)
  })

  // Map communities with sponsors (no N+1 queries!)
  const communitiesWithSponsors = communities.map((community) => {
    const relationships = relationshipsByCommunity.get((community as any).id) || []
    // Limit to top 5 sponsors per community
    const topSponsors = relationships.slice(0, 5)
    
    const sponsors = topSponsors.map((rel: any) => ({
      id: rel.profiles?.id,
      company_name: rel.profiles?.company_name || rel.profiles?.full_name,
      logo_url: rel.profiles?.logo_url,
      total_sponsored: rel.total_sponsored,
      verified_brand: rel.profiles?.verified_brand
    }))

    const totalSponsored = relationships.reduce((sum: number, rel: any) => sum + (rel.total_sponsored || 0), 0)
    const activeNeeds = needsCountByCommunity.get((community as any).id) || 0

    return {
      ...(community as any),
      sponsors,
      total_sponsored: totalSponsored,
      active_needs: activeNeeds
    }
  })

  return communitiesWithSponsors
}

export default async function CommunitiesPage() {
  const user = await getCurrentUser()
  const communities = await getAllCommunities()

  return <CommunitiesWithLoading initialCommunities={communities} />
}
