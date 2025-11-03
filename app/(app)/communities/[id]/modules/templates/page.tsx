import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import TemplateBrowserClient from './TemplateBrowserClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TemplatesPage({ params }: PageProps) {
  const { id: communityId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Verify user is admin/founder
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'founder' && membership.role !== 'admin')) {
    redirect(`/communities/${communityId}`)
  }

  // Fetch community details
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug')
    .eq('id', communityId)
    .single()

  if (!community) {
    redirect('/communities')
  }

  return (
    <TemplateBrowserClient 
      communityId={communityId}
      communityName={community.name}
      userId={user.id}
    />
  )
}

