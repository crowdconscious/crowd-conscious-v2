import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import LocationClaimClient from '@/components/perks/LocationClaimClient'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export default async function LocationClaimPage({ params }: Props) {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: location } = await admin
    .from('conscious_locations')
    .select('slug, name, contact_email, owner_profile_id, status')
    .eq('slug', slug)
    .maybeSingle()

  if (!location) notFound()

  const user = await getCurrentUser()
  if (user && location.owner_profile_id === user.id) {
    redirect(`/dashboard/location/${encodeURIComponent(slug)}`)
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <LocationClaimClient
        location={location}
        userEmail={user?.email ?? null}
        isAuthed={Boolean(user)}
      />
    </div>
  )
}
