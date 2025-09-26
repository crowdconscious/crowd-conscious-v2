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

  // Get sponsor data for each community
  const communitiesWithSponsors = await Promise.all(
    communities.map(async (community) => {
      // Get brand relationships for this community
      const { data: relationships } = await supabase
        .from('brand_community_relationships')
        .select(`
          total_sponsored,
          profiles (
            id,
            company_name,
            full_name,
            logo_url,
            verified_brand
          )
        `)
        .eq('community_id', community.id)
        .eq('is_active', true)
        .order('total_sponsored', { ascending: false })
        .limit(5)

      // Get active needs count
      const { count: activeNeeds } = await supabase
        .from('community_content')
        .select('id', { count: 'exact' })
        .eq('community_id', community.id)
        .eq('type', 'need')
        .in('status', ['voting', 'approved'])

      const sponsors = relationships?.map(rel => ({
        id: rel.profiles.id,
        company_name: rel.profiles.company_name || rel.profiles.full_name,
        logo_url: rel.profiles.logo_url,
        total_sponsored: rel.total_sponsored,
        verified_brand: rel.profiles.verified_brand
      })) || []

      const totalSponsored = relationships?.reduce((sum, rel) => sum + rel.total_sponsored, 0) || 0

      return {
        ...community,
        sponsors,
        total_sponsored: totalSponsored,
        active_needs: activeNeeds || 0
      }
    })
  )

  return communitiesWithSponsors
}

export default async function CommunitiesPage() {
  const user = await getCurrentUser()
  const communities = await getAllCommunities()

  return <CommunitiesWithLoading initialCommunities={communities} />
}
