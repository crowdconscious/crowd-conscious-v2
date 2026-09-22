import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { isCivicReputationEnabled } from '@/lib/reputation/domains'
import { loadPrivateCivicReputation } from '@/lib/reputation/user-reputation'
import { ReputacionClient } from './ReputacionClient'

export const metadata: Metadata = {
  title: 'Tu reputación | Crowd Conscious',
  robots: { index: false, follow: false },
}

/**
 * Private "Tu reputación" — own profile only (UX overhaul §3.6).
 * Not on the marketing homepage. Not a public leaderboard.
 */
export default async function ReputacionPage() {
  if (!isCivicReputationEnabled()) {
    notFound()
  }

  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/predictions/reputacion')
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const supabase = await createClient()
  const snapshot = await loadPrivateCivicReputation(supabase, user.id)

  return (
    <ReputacionClient
      locale={locale}
      totalPoints={snapshot.totalPoints}
      breakdown={snapshot.breakdown}
      recent={snapshot.recent}
    />
  )
}
