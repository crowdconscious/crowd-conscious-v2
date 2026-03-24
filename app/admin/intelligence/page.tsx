import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { fetchIntelligenceDashboard } from '@/lib/intelligence-data'
import IntelligenceClient from './IntelligenceClient'

export const metadata = {
  title: 'Intelligence Hub | Admin',
  description: 'Admin analytics dashboard',
}

/**
 * Admin-only analytics. Auth:
 * - profiles.user_type === 'admin', or
 * - user.email === process.env.ADMIN_EMAIL (fallback if role not set in DB)
 *
 * Parent admin layout also enforces admin; this page adds ADMIN_EMAIL fallback using the session.
 */
export default async function IntelligencePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, email')
    .eq('id', user.id)
    .single()

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const sessionEmail = user.email?.toLowerCase().trim()
  const isAdmin =
    profile?.user_type === 'admin' ||
    (!!adminEmail && !!sessionEmail && sessionEmail === adminEmail)

  if (!isAdmin) {
    redirect('/dashboard?error=unauthorized')
  }

  const data = await fetchIntelligenceDashboard()

  return <IntelligenceClient data={data} />
}
