import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ModuleBuilderClient from './ModuleBuilderClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CreateModulePage({ params }: PageProps) {
  const { id: communityId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is community admin/founder
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
    .select('id, name, slug, core_values')
    .eq('id', communityId)
    .single()

  if (!community) {
    redirect('/communities')
  }

  return (
    <ModuleBuilderClient
      communityId={community.id}
      communityName={community.name}
      communitySlug={community.slug}
      userId={user.id}
    />
  )
}

