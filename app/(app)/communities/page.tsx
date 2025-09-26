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
}

async function getAllCommunities(): Promise<Community[]> {
  const { data, error } = await supabase
    .from('communities')
    .select('id, name, description, address, core_values, member_count, created_at, image_url, logo_url, banner_url')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching communities:', error)
    return []
  }

  return data || []
}

export default async function CommunitiesPage() {
  const user = await getCurrentUser()
  const communities = await getAllCommunities()

  return <CommunitiesWithLoading initialCommunities={communities} />
}
