'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { normalizeSponsorTierId, SPONSOR_TIERS } from '@/lib/sponsor-tiers'

export type SponsorshipLogPublic = {
  id: string
  sponsor_name: string
  is_anonymous: boolean
  sponsor_tier: string
  amount_paid: number
  net_amount: number
  fund_allocation: number
  fund_percent: number
  paid_at: string
}

export type CauseBreakdownRow = {
  name: string
  amount: number
  votes: number
}

function formatMoney(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${Math.round(num).toLocaleString()}`
}

function formatMoneyFull(num: number): string {
  return `$${Math.round(num).toLocaleString()}`
}

function formatRowDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function tierLabel(tierRaw: string, locale: string): string {
  const id = normalizeSponsorTierId(tierRaw)
  const t = SPONSOR_TIERS[id]
  return locale === 'es' ? t.nameEs : t.name
}

type Props = {
  sponsorships: SponsorshipLogPublic[]
  sponsorshipTotalCount: number
  totalDistributed: number
  causesSupported: number
  causesBreakdown: CauseBreakdownRow[]
}

const INITIAL_ROWS = 10

export function TransparencyDashboard({
  sponsorships,
  sponsorshipTotalCount,
  totalDistributed,
  causesSupported,
  causesBreakdown,
}: Props) {
  const { language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const [expanded, setExpanded] = useState(false)

  const displayLogs = useMemo(
    () => (expanded ? sponsorships : sponsorships.slice(0, INITIAL_ROWS)),
    [expanded, sponsorships]
  )

  const maxCauseAmount = useMemo(
    () => Math.max(1, ...causesBreakdown.map((c) => c.amount)),
    [causesBreakdown]
  )

  const t = {
    title: locale === 'es' ? 'Transparencia del Fondo' : 'Fund Transparency',
    subtitle:
      locale === 'es'
        ? 'Cada peso es rastreable. Cada causa es elegida por la comunidad.'
        : 'Every peso is traceable. Every cause is chosen by the community.',
    statDistributed: locale === 'es' ? 'Total distribuido' : 'Total distributed',
    statCauses: locale === 'es' ? 'Causas apoyadas' : 'Causes supported',
    statSponsors: locale === 'es' ? 'Patrocinios recibidos' : 'Sponsorships received',
    sectionCauses: locale === 'es' ? 'Distribución por causa' : 'Distribution by cause',
    sectionHistory: locale === 'es' ? 'Historial de patrocinios' : 'Sponsorship history',
    emptyTitle:
      locale === 'es'
        ? 'Aún no hay patrocinios registrados en el historial público.'
        : 'No sponsorship payments logged for public transparency yet.',
    emptyCta: locale === 'es' ? 'Ver planes de patrocinio' : 'View sponsorship plans',
    footnote:
      locale === 'es'
        ? 'Cada patrocinio aporta entre 20% y 40% al Fondo Consciente, dependiendo del nivel del patrocinio.'
        : 'Each sponsorship contributes between 20% and 40% to the Conscious Fund, depending on tier.',
    colDate: locale === 'es' ? 'Fecha' : 'Date',
    colSponsor: locale === 'es' ? 'Patrocinador' : 'Sponsor',
    colTier: locale === 'es' ? 'Nivel' : 'Tier',
    colAmount: locale === 'es' ? 'Monto' : 'Amount',
    colFund: locale === 'es' ? 'Al fondo' : 'To fund',
    anonymous: locale === 'es' ? 'Patrocinador anónimo' : 'Anonymous sponsor',
    showAll: locale === 'es' ? 'Ver todo' : 'Show all',
    showLess: locale === 'es' ? 'Ver menos' : 'Show less',
    illustrative:
      locale === 'es'
        ? 'Proporción ilustrativa según votos (asignación real puede variar por ciclo).'
        : 'Illustrative share by votes (actual grants may vary by cycle).',
  }

  const hasRows = sponsorships.length > 0

  return (
    <section
      className="border-t border-[#2d3748] pt-12 mt-12"
      aria-label={locale === 'es' ? 'Transparencia del fondo' : 'Fund transparency'}
    >
      <div className="flex items-start gap-3 mb-2">
        <BarChart3 className="w-7 h-7 text-emerald-400 shrink-0" aria-hidden />
        <div>
          <h2 className="text-white text-2xl font-bold">{t.title}</h2>
          <p className="text-gray-400 text-sm mt-1 mb-8">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-[#1a2029] border border-emerald-500/20 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">{t.statDistributed}</p>
          <p className="text-2xl font-bold text-emerald-400">{formatMoneyFull(totalDistributed)} MXN</p>
        </div>
        <div className="bg-[#1a2029] border border-emerald-500/20 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">{t.statCauses}</p>
          <p className="text-2xl font-bold text-white">{causesSupported}</p>
        </div>
        <div className="bg-[#1a2029] border border-emerald-500/20 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">{t.statSponsors}</p>
          <p className="text-2xl font-bold text-white">{sponsorshipTotalCount}</p>
        </div>
      </div>

      <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
        — {t.sectionCauses} —
      </h3>
      <p className="text-gray-500 text-xs mb-4">{t.illustrative}</p>

      {causesBreakdown.length === 0 ? (
        <div className="bg-[#1a2029] rounded-xl border border-cc-border p-6 text-gray-400 text-sm mb-10">
          {locale === 'es' ? 'No hay causas activas aún.' : 'No active causes yet.'}
        </div>
      ) : (
        <div className="space-y-4 mb-10">
          {causesBreakdown.map((row, i) => {
            const w = maxCauseAmount > 0 ? (row.amount / maxCauseAmount) * 100 : 0
            return (
              <div key={`${row.name}-${i}`}>
                <div className="flex justify-between items-center gap-3 text-sm mb-1">
                  <span className="text-gray-200 truncate">{row.name}</span>
                  <span className="text-emerald-400 font-semibold shrink-0 tabular-nums">
                    {formatMoney(row.amount)}
                  </span>
                </div>
                <div className="w-full bg-gray-800/50 h-8 rounded-lg relative overflow-hidden">
                  <div
                    className="bg-emerald-500/30 absolute left-0 top-0 h-full rounded-lg transition-all"
                    style={{ width: `${Math.min(100, w)}%` }}
                  />
                </div>
                {row.votes > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {row.votes} {locale === 'es' ? 'votos' : 'votes'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
        — {t.sectionHistory} —
      </h3>

      {!hasRows ? (
        <div className="bg-[#1a2029] rounded-xl border border-cc-border p-8 text-center mb-6">
          <p className="text-gray-400 text-sm mb-4">{t.emptyTitle}</p>
          <Link
            href="/sponsor"
            className="inline-flex text-emerald-400 hover:text-emerald-300 font-medium text-sm"
          >
            {t.emptyCta} →
          </Link>
        </div>
      ) : (
        <div className="bg-[#1a2029] rounded-xl border border-cc-border overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-800">
                  <th className="px-4 py-3 font-medium">{t.colDate}</th>
                  <th className="px-4 py-3 font-medium">{t.colSponsor}</th>
                  <th className="px-4 py-3 font-medium">{t.colTier}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.colAmount}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.colFund}</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.map((row) => (
                  <tr key={row.id} className="border-b border-gray-800/80 last:border-0">
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {formatRowDate(row.paid_at, locale)}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {row.is_anonymous ? t.anonymous : row.sponsor_name}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{tierLabel(row.sponsor_tier, locale)}</td>
                    <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                      {formatMoneyFull(row.amount_paid)} MXN
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold tabular-nums">
                      → {formatMoneyFull(row.fund_allocation)} MXN
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sponsorships.length > INITIAL_ROWS && (
            <div className="px-4 py-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                {expanded ? t.showLess : t.showAll}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-gray-500 text-sm leading-relaxed">{t.footnote}</p>
    </section>
  )
}
