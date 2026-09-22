import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  activityTriggerLabel,
  fetchUserResolutionActivity,
} from '@/lib/resolution/user-activity'
import { ActividadClient } from './ActividadClient'

export const metadata: Metadata = {
  title: 'Tu actividad | Crowd Conscious',
  robots: { index: false, follow: false },
}

/**
 * Thin logged-in "Tu actividad" — things you touched that moved.
 * Not mobile Impact Home / reputation / perks (Phase 3 / mobile-only).
 */
export default async function ActividadPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/predictions/actividad')
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const admin = createAdminClient()
  const items = await fetchUserResolutionActivity(admin, user.id, 40)

  return (
    <ActividadClient
      locale={locale}
      items={items.map((item) => ({
        ...item,
        label: activityTriggerLabel(item.trigger, locale),
      }))}
    />
  )
}
