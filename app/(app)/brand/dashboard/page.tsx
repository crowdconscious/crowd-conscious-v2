import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import BrandDashboardClient from './BrandDashboardClient'

// Force dynamic rendering due to authentication checks
export const dynamic = 'force-dynamic'

async function getBrandDashboardData(userId: string) {
  // Get brand profile
  const { data: brandProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('user_type', 'brand')
    .single()

  if (!brandProfile) {
    return null // Not a brand
  }

  // Get brand preferences
  const { data: brandPreferences } = await supabase
    .from('brand_preferences')
    .select('*')
    .eq('brand_id', userId)
    .single()

  // Get active sponsorship applications
  const { data: applications } = await supabase
    .from('sponsorship_applications')
    .select(`
      *,
      community_content (
        id,
        title,
        type,
        description,
        funding_goal,
        current_funding,
        status,
        communities (
          id,
          name,
          member_count,
          image_url
        )
      )
    `)
    .eq('brand_id', userId)
    .order('created_at', { ascending: false })

  // Get paid sponsorships (brand's impact)
  const { data: sponsorships } = await supabase
    .from('sponsorships')
    .select(`
      *,
      community_content (
        id,
        title,
        type,
        status,
        communities (
          id,
          name,
          image_url
        )
      )
    `)
    .eq('sponsor_id', userId)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })

  // Get brand-community relationships
  const { data: relationships } = await supabase
    .from('brand_community_relationships')
    .select(`
      *,
      communities (
        id,
        name,
        image_url,
        member_count,
        description
      )
    `)
    .eq('brand_id', userId)
    .eq('is_active', true)

  // Get available sponsorship opportunities
  const { data: opportunities } = await supabase
    .from('community_content')
    .select(`
      id,
      title,
      type,
      description,
      funding_goal,
      current_funding,
      status,
      created_at,
      communities (
        id,
        name,
        member_count,
        image_url,
        core_values
      )
    `)
    .eq('type', 'need')
    .in('status', ['voting', 'approved'])
    .lt('current_funding', 'funding_goal')
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    brandProfile,
    brandPreferences,
    applications: applications || [],
    sponsorships: sponsorships || [],
    relationships: relationships || [],
    opportunities: opportunities || []
  }
}

export default async function BrandDashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const dashboardData = await getBrandDashboardData((user as any).id)

  if (!dashboardData) {
    // User is not a brand, redirect to user dashboard
    redirect('/dashboard')
  }

  return (
    <BrandDashboardClient 
      user={user} 
      dashboardData={dashboardData}
    />
  )
}
