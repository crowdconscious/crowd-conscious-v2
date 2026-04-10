import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { fetchMarketsForSponsorAccount } from '@/lib/sponsor-account-access'
import SponsorShareClient from '@/components/sponsor/SponsorShareClient'

export const dynamic = 'force-dynamic'

export default async function SponsorSharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: account } = await admin
    .from('sponsor_accounts')
    .select('id, company_name, contact_email')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()

  if (!account) notFound()

  const markets = await fetchMarketsForSponsorAccount(admin, {
    id: account.id,
    company_name: account.company_name,
    contact_email: account.contact_email,
  })

  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://crowdconscious.app').replace(/\/$/, '')

  const items = markets.map((m) => ({
    id: m.id,
    title: m.title,
    url: `${appOrigin}/predictions/markets/${m.id}`,
  }))

  return (
    <div className="min-h-screen bg-[#0f1419] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <Link href={`/dashboard/sponsor/${token}`} className="mb-6 text-sm text-emerald-400 hover:underline">
          ← Volver al dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">Compartir</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enlaces públicos, WhatsApp y códigos QR para cada mercado.
        </p>
        <SponsorShareClient markets={items} />
      </div>
    </div>
  )
}
