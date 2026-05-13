import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import EditMarketForm from '@/components/admin/EditMarketForm'

export const dynamic = 'force-dynamic'

export default async function EditMarketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  if (!isAdminUser(user)) redirect('/predictions')

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
