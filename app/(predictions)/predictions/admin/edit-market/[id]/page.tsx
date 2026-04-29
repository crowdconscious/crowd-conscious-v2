import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import EditMarketForm from '@/components/admin/EditMarketForm'

export const dynamic = 'force-dynamic'

export default async function EditMarketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const profileEmail = user.email?.toLowerCase().trim()
  const isAdmin =
    user.user_type === 'admin' ||
    (!!adminEmail && !!profileEmail && profileEmail === adminEmail)

  if (!isAdmin) redirect('/predictions')

  const { id } = await params
  const admin = createAdminClient()

  const { data: market, error } = await admin
    .from('prediction_markets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !market) notFound()

  const { data: outcomes } = await admin
    .from('market_outcomes')
    .select('id, label, subtitle')
    .eq('market_id', id)
    .order('sort_order', { ascending: true })

  const { data: sponsorAccounts } = await admin
    .from('sponsor_accounts')
    .select('id, company_name, tier')
    .eq('status', 'active')
    .order('company_name', { ascending: true })

  return (
    <div className="min-h-screen bg-[#0f1419] px-4 py-8 text-slate-100">
      <EditMarketForm
        market={market}
        outcomes={outcomes ?? []}
        sponsorAccounts={sponsorAccounts ?? []}
      />
    </div>
  )
}
