import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { fetchMarketsForSponsorAccount } from '@/lib/sponsor-account-access'
import { FileDown, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SponsorReportsPage({
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

  return (
    <div className="min-h-screen bg-[#0f1419] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/dashboard/sponsor/${token}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">Reportes</h1>
        <p className="mt-2 text-sm text-slate-400">
          Descarga un PDF imprimible por mercado. Incluye resultados, confianza y votos en el tiempo.
        </p>
        <ul className="mt-8 space-y-3">
          {markets.length === 0 ? (
            <li className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6 text-slate-400">
              Aún no hay mercados vinculados a tu cuenta.
            </li>
          ) : (
            markets.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2d3748] bg-[#1a2029] p-4"
              >
                <span className="font-medium text-white">{m.title}</span>
                <Link
                  href={`/dashboard/sponsor/${token}/report/${m.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10"
                >
                  <FileDown className="h-4 w-4" />
                  Abrir PDF / imprimir
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
