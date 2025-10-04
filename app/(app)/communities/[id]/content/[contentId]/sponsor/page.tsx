import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import SponsorCheckoutClient from './SponsorCheckoutClient'

export const dynamic = 'force-dynamic'

interface SponsorPageProps {
  params: Promise<{
    id: string
    contentId: string
  }>
}

async function getContentForSponsorship(contentId: string) {
  const { data, error } = await supabase
    .from('community_content')
    .select(`
      *,
      communities (
        id,
        name
      )
    `)
    .eq('id', contentId)
    .single()

  if (error) return null
  return data
}

export default async function SponsorPage({ params }: SponsorPageProps) {
  const user = await getCurrentUser()
  const { id: communityId, contentId } = await params

  // Require authentication
  if (!user) {
    redirect(`/login?redirect=/communities/${communityId}/content/${contentId}/sponsor`)
  }

  const content = await getContentForSponsorship(contentId)

  if (!content || content.type !== 'need' || !content.funding_goal) {
    notFound()
  }

  return (
    <SponsorCheckoutClient
      contentId={content.id}
      contentTitle={content.title}
      fundingGoal={content.funding_goal}
      currentFunding={content.current_funding || 0}
      communityName={(content.communities as any)?.name || 'Community'}
    />
  )
}
