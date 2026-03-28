import { createAdminClient } from '@/lib/supabase-admin'
import { notFound } from 'next/navigation'
import { getFundPercent, normalizeSponsorTierId } from '@/lib/sponsor-tiers'
import dynamic from 'next/dynamic'
import { BarChart3, Users, Heart, ExternalLink } from 'lucide-react'
import LandingNav from '@/app/components/landing/LandingNav'

const Footer = dynamic(() => import('@/components/Footer'))

async function getSponsorReport(id: string, token: string | null) {
  if (!token) return null

  const admin = createAdminClient()
  const { data: sponsorship, error } = await admin
    .from('sponsorships')
    .select('*')
    .eq('id', id)
    .eq('report_token', token)
    .single()

  if (error || !sponsorship) return null

  let marketIds: string[] = []
  let marketTitles: string[] = []

  if ((sponsorship.tier === 'market' || sponsorship.tier === 'starter') && sponsorship.market_id) {
    marketIds = [sponsorship.market_id]
    const { data: m } = await admin
      .from('prediction_markets')
      .select('id, title')
      .eq('id', sponsorship.market_id)
      .single()
    if (m) {
      marketTitles = [m.title ?? 'Unknown']
    }
  } else {
    const { data: markets } = await admin
      .from('prediction_markets')
      .select('id, title')
      .eq('sponsor_id', sponsorship.id)
    marketIds = (markets ?? []).map((m) => m.id)
    marketTitles = (markets ?? []).map((m) => m.title ?? 'Unknown')
  }

  const [
    { count: votesCount },
    { data: votes },
    { data: trades },
  ] = await Promise.all([
    admin.from('market_votes').select('id', { count: 'exact', head: true }).in('market_id', marketIds),
    marketIds.length > 0
      ? admin.from('market_votes').select('user_id').in('market_id', marketIds)
      : { data: [] },
    marketIds.length > 0
      ? admin.from('prediction_trades').select('user_id').in('market_id', marketIds)
      : { data: [] },
  ])

  const uniqueUsers = new Set<string>()
  for (const v of votes ?? []) {
    if (v.user_id) uniqueUsers.add(v.user_id)
  }
  for (const t of trades ?? []) {
    if (t.user_id) uniqueUsers.add(t.user_id)
  }

  const totalPredictions = (votesCount ?? 0) + (trades ?? []).length
  const fundAmount = Number(sponsorship.fund_amount ?? 0)
  const fundPercentLabel = Math.round(
    getFundPercent(normalizeSponsorTierId(sponsorship.tier as string)) * 100
  )

  return {
    sponsorship,
    marketIds,
    marketTitles,
    totalPredictions,
    uniqueUsers: uniqueUsers.size,
    fundAmount,
    fundPercentLabel,
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default async function SponsorReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token } = await searchParams

  const report = await getSponsorReport(id, token ?? null)

  if (!report) {
    notFound()
  }

  const { sponsorship, marketTitles, totalPredictions, uniqueUsers, fundAmount, fundPercentLabel } =
    report
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNav />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-8">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Thank you, {sponsorship.sponsor_name}!
              </h1>
              <p className="text-slate-400">
                Your sponsorship is making a real impact. Here&apos;s how your brand is reaching our community.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <BarChart3 className="w-4 h-4" />
                  Total predictions
                </div>
                <p className="text-2xl font-bold text-white">{totalPredictions.toLocaleString()}</p>
                <p className="text-slate-500 text-xs mt-1">on your sponsored market(s)</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Users className="w-4 h-4" />
                  Unique users
                </div>
                <p className="text-2xl font-bold text-white">{uniqueUsers.toLocaleString()}</p>
                <p className="text-slate-500 text-xs mt-1">engaged with your brand</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Heart className="w-4 h-4" />
                  Conscious Fund
                </div>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(fundAmount)}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {fundPercentLabel}% of estimated net allocated to community causes
                </p>
              </div>
            </div>

            {marketTitles.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Your sponsored market(s)</h2>
                <div className="space-y-2">
                  {marketTitles.map((title, i) => (
                    <a
                      key={i}
                      href={`${baseUrl}/predictions/markets/${report.marketIds[i]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 text-white transition-colors"
                    >
                      <span className="truncate">{title}</span>
                      <ExternalLink className="w-4 h-4 text-emerald-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-emerald-400 font-medium mb-2">Your impact</p>
              <p className="text-slate-300 text-sm">
                {formatCurrency(fundAmount)} of your sponsorship goes directly to the Conscious Fund. Our users vote on which community causes receive grants each month. Your brand is credited for this impact — thank you for being part of something bigger.
              </p>
            </div>

            <div className="text-center pt-4">
              <a
                href={`${baseUrl}/predictions/markets`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
              >
                Browse all markets
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
