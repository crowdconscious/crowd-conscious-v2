import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { fetchIntelligenceDashboard } from '@/lib/intelligence-data'
import IntelligenceClient from './IntelligenceClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Intelligence Hub | Predictions',
  description: 'Admin analytics dashboard',
}

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<{ archived?: string }>
}) {
  const sp = (await searchParams) ?? {}
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
    redirect('/predictions')
  }

  const data = await fetchIntelligenceDashboard({ includeArchived: sp.archived === '1' })

  return <IntelligenceClient initialData={data} initialIncludeArchived={sp.archived === '1'} />
}
