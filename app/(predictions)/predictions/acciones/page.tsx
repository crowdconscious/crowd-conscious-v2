import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { loadUserActions } from '@/lib/actions/user-actions'
import { isCivicReputationEnabled } from '@/lib/reputation/domains'
import { AccionesClient } from './AccionesClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tus acciones | Crowd Conscious',
  robots: { index: false, follow: false },
}

/**
 * Private "Tus acciones" (Modelo Consciente). Own user only.
 * Real actions as evidence — counts and a recent list. No points, no ranking.
 */
export default async function AccionesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/predictions/acciones')
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  // Queries are always scoped to the signed-in user's id.
  const summary = await loadUserActions(createAdminClient(), user.id, locale)

  return (
    <AccionesClient
      locale={locale}
      counts={summary.counts}
      recent={summary.recent}
      showReputationLink={isCivicReputationEnabled()}
    />
  )
}
