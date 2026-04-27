'use client'

import type React from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FileDown, BarChart3, Share2, BookOpen, Sparkles, HelpCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { SponsorOnboardingBanner } from '@/components/sponsor/SponsorOnboardingBanner'
import { SponsorMarketCard } from '@/components/sponsor/SponsorMarketCard'
import { SuggestCauseForm } from '@/components/sponsor/SuggestCauseForm'
import { SponsorEmailPreferences } from '@/components/sponsor/SponsorEmailPreferences'
import type { SponsorDashboardMarketRow, FundImpactRow } from '@/components/sponsor/types'
import { useLanguage, type Language } from '@/contexts/LanguageContext'
import { useSponsorT } from '@/lib/i18n/sponsor-dashboard'
import { normalizeSponsorUpgradeTier } from '@/lib/sponsor-upgrade-tier'
import {
  pulseLifecycleFromMarket,
  PULSE_LIFECYCLE_LABELS,
  type PulseLifecycle,
} from '@/lib/sponsor-pulse-status'

export type { SponsorOutcomeRow, SponsorDashboardMarketRow, FundImpactRow } from '@/components/sponsor/types'

const TIER_LABELS: Record<string, { label: { es: string; en: string }; color: string }> = {
  starter: { label: { es: 'Patrocinador de Mercado', en: 'Market Sponsor' }, color: 'text-slate-400' },
  growth: { label: { es: 'Patrocinador de Categoría', en: 'Category Sponsor' }, color: 'text-emerald-400' },
  champion: { label: { es: 'Socio de Impacto', en: 'Impact Partner' }, color: 'text-amber-400' },
  anchor: { label: { es: 'Patrocinador Fundador', en: 'Founding Sponsor' }, color: 'text-purple-400' },
  pilot: { label: { es: 'Pilot Pulse', en: 'Pulse Pilot' }, color: 'text-cyan-400' },
  pulse_unico: { label: { es: 'Pulse Único', en: 'Pulse Single' }, color: 'text-emerald-400' },
  pulse_pack: { label: { es: 'Pulse Pack (3)', en: 'Pulse Pack (3)' }, color: 'text-emerald-400' },
  suscripcion: { label: { es: 'Suscripción Pulse', en: 'Pulse Subscription' }, color: 'text-amber-400' },
  mundial_pack: { label: { es: 'Mundial Pulse Pack', en: 'Mundial Pulse Pack' }, color: 'text-amber-400' },
  mundial_pack_founding: { label: { es: 'Mundial Pack · Fundador', en: 'Mundial Pack · Founder' }, color: 'text-fuchsia-400' },
  enterprise: { label: { es: 'Enterprise', en: 'Enterprise' }, color: 'text-purple-400' },
}

type RawMarket = {
  id: string
  title: string
  cover_image_url?: string | null
  translations?: unknown
}

type Props = {
  account: {
    company_name: string
    logo_url: string | null
    tier: string
    is_pulse_client: boolean | null
    total_fund_contribution: number | null
    total_spent: number | null
    created_at: string
    contact_email: string
    max_pulse_markets: number
    used_pulse_markets: number
    email_preferences?: Record<string, unknown> | null
    locale?: string | null
  }
  markets: SponsorDashboardMarketRow[]
  marketsRaw: RawMarket[]
  totalVotes: number
  activeMarketCount: number
  totalReasonings: number
  avgConfidenceOverall: number | null
  fundImpactRows: FundImpactRow[]
  token: string
  isFirstVisit: boolean
  appOrigin: string
  isImpersonating?: boolean
}

function fmtDate(iso: string, language: Language) {
  try {
    return new Date(iso).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function displayTitle(raw: RawMarket, fallback: string): string {
  const tr = raw.translations as { es?: { title?: string } } | null
  const t = tr?.es?.title?.trim()
  return t || fallback
}

export default function SponsorDashboardClient({
  account,
  markets,
  marketsRaw,
  totalVotes,
  activeMarketCount,
  totalReasonings,
  avgConfidenceOverall,
  fundImpactRows,
  token,
  isFirstVisit,
  appOrigin,
  isImpersonating = false,
}: Props) {
  const router = useRouter()
  const { t, language } = useSponsorT()
  const { setLanguage } = useLanguage()
  const fundTotal = Number(account.total_fund_contribution ?? 0)
  const showPulse = account.is_pulse_client === true
  const tierEntry = TIER_LABELS[account.tier] ?? TIER_LABELS.starter
  const tierLabel = tierEntry.label[language === 'en' ? 'en' : 'es']
  const tierColor = tierEntry.color
  const maxPulse = account.max_pulse_markets ?? 1
  const usedPulse = account.used_pulse_markets ?? 0
  const unlimited = maxPulse >= 999
  const atPulseLimit = !unlimited && usedPulse >= maxPulse
  const pulsePct = unlimited ? 100 : maxPulse > 0 ? Math.min(100, Math.round((usedPulse / maxPulse) * 100)) : 0
  const [welcomeOverrideOpen, setWelcomeOverrideOpen] = useState(false)
  const showBanner = isFirstVisit || welcomeOverrideOpen

  // Tier-aware upgrade CTA. Both the old "Comprar más" (+1 slot add-on)
  // and "Subir de plan" buttons are consolidated into this single entry,
  // which routes to /dashboard/sponsor/[token]/upgrade. The /upgrade page
  // surfaces the right subset of options per tier.
  //
  // - Enterprise: hide the upgrade entry; show a mailto CTA instead.
  // - Suscripción: "Gestionar plan" (neutral — see current status + Enterprise).
  // - Everything else: "Expandir plan" (active upsell).
  const normalizedTier = normalizeSponsorUpgradeTier(account.tier)
  const hideUpgradeCta = normalizedTier === 'enterprise'
  const upgradeCtaLabel =
    normalizedTier === 'suscripcion'
      ? t('plan.manage_plan_cta_subscription')
      : t('plan.manage_plan_cta')
  const enterpriseMailto = (() => {
    const subject = encodeURIComponent(
      language === 'en'
        ? `Enterprise plan — ${account.company_name}`
        : `Plan Enterprise — ${account.company_name}`
    )
    return `mailto:comunidad@crowdconscious.app?subject=${subject}`
  })()

  const enriched = useMemo(() => {
    return markets.map((m) => {
      const raw = marketsRaw.find((r) => r.id === m.id)
      return {
        ...m,
        coverImageUrl: raw?.cover_image_url ?? null,
        displayTitle: raw ? displayTitle(raw, m.title) : m.title,
      }
    })
  }, [markets, marketsRaw])

  const pulseRows = useMemo(() => enriched.filter((m) => m.isPulse), [enriched])
  const otherRows = useMemo(() => enriched.filter((m) => !m.isPulse), [enriched])

  // The selected Pulse drives the analytics card. Default to the first
  // assigned Pulse. If the sponsor has zero Pulses but classic markets, we
  // skip the My Pulses block entirely.
  const [selectedPulseId, setSelectedPulseId] = useState<string | null>(
    pulseRows[0]?.id ?? null
  )
  const selectedPulse = useMemo(() => {
    if (!selectedPulseId) return null
    return pulseRows.find((m) => m.id === selectedPulseId) ?? pulseRows[0] ?? null
  }, [pulseRows, selectedPulseId])

  const mxnLocale = language === 'en' ? 'en-US' : 'es-MX'
  const fundFormatted = fundTotal.toLocaleString(mxnLocale, { maximumFractionDigits: 0 })

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      {isImpersonating ? (
        <div className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
            <ShieldCheck className="h-4 w-4 flex-none text-amber-300" />
            <span>
              <strong className="font-semibold">{t('impersonation.viewing_as')}</strong>{' '}
              {account.company_name}
            </span>
            <Link
              href="/admin/sponsors"
              className="ml-auto inline-flex items-center rounded-full border border-amber-300/40 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-300/10"
            >
              ← {t('impersonation.back_to_admin')}
            </Link>
          </div>
        </div>
      ) : null}
      <header className="border-b border-[#2d3748] bg-[#0f1419] px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {account.logo_url ? (
              <Image
                src={account.logo_url}
                alt=""
                width={160}
                height={48}
                className="max-h-12 w-auto rounded-lg object-contain"
                unoptimized
              />
            ) : null}
            <div>
              <h1 className="text-xl font-semibold text-white sm:text-2xl">
                {t('header.title_prefix')} {account.company_name}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                <span className={tierColor}>{tierLabel}</span>
                {' · '}
                {t('header.active_since')} {fmtDate(account.created_at, language)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setWelcomeOverrideOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#2d3748] text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300"
              aria-label={t('header.help_button')}
              title={t('header.help_button')}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <div
              className="inline-flex overflow-hidden rounded-full border border-[#2d3748] text-xs font-semibold"
              role="group"
              aria-label="Language"
            >
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`h-11 px-3 ${language === 'es' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:bg-white/5'}`}
                aria-pressed={language === 'es'}
              >
                {t('header.language_toggle_es')}
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`h-11 px-3 ${language === 'en' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:bg-white/5'}`}
                aria-pressed={language === 'en'}
              >
                {t('header.language_toggle_en')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-8">
        {showBanner ? (
          <SponsorOnboardingBanner
            companyName={account.company_name}
            isPulseClient={showPulse}
            token={token}
            contactEmail={account.contact_email}
            forceOpen={!isFirstVisit && welcomeOverrideOpen}
            onClose={() => setWelcomeOverrideOpen(false)}
          />
        ) : null}

        {showPulse ? (
          <section className="rounded-xl border border-emerald-500/25 bg-[#1a2029] p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              {t('plan.title')}
            </h2>
            <p className="mt-2 text-lg font-semibold text-white">
              {t('plan.your_plan')} <span className={tierColor}>{tierLabel}</span>
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {t('plan.pulse_markets_used')}{' '}
              <span className="font-medium text-white">
                {usedPulse} {t('plan.of')} {unlimited ? '∞' : maxPulse} {t('plan.used')}
              </span>
            </p>
            <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pulsePct}%` }}
              />
            </div>
            {atPulseLimit ? (
              <p className="mt-3 text-sm text-amber-400/95">
                {t('plan.at_limit')}{' '}
                {hideUpgradeCta ? (
                  <a
                    href={enterpriseMailto}
                    className="font-medium text-emerald-400 underline hover:text-emerald-300"
                  >
                    {t('plan.enterprise_contact_cta')} →
                  </a>
                ) : (
                  <Link
                    href={`/dashboard/sponsor/${token}/upgrade`}
                    className="font-medium text-emerald-400 underline hover:text-emerald-300"
                  >
                    {upgradeCtaLabel} →
                  </Link>
                )}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/dashboard/sponsor/${token}/create-pulse`}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
                  atPulseLimit ? 'cursor-not-allowed bg-slate-600 opacity-60 pointer-events-none' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                aria-disabled={atPulseLimit}
              >
                {t('plan.create_new')}
              </Link>
              {hideUpgradeCta ? (
                <a
                  href={enterpriseMailto}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/10 px-5 py-2.5 text-sm font-semibold text-purple-300 hover:bg-purple-500/20"
                >
                  {t('plan.enterprise_contact_cta')} →
                </a>
              ) : (
                <Link
                  href={`/dashboard/sponsor/${token}/upgrade`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  {upgradeCtaLabel} →
                </Link>
              )}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-[#2d3748] bg-[#1a2029]/80 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            {t('sponsor_markets.title')}
          </h2>
          <p className="mt-2 text-sm text-slate-400">{t('sponsor_markets.subtitle')}</p>
          <Link
            href={`/markets?sponsor_mode=true&token=${encodeURIComponent(token)}`}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-600"
          >
            {t('sponsor_markets.cta')} →
          </Link>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label={t('stats.active_markets')} value={String(activeMarketCount)} />
          <StatCard label={t('stats.total_votes')} value={totalVotes.toLocaleString(mxnLocale)} />
          <StatCard
            label={t('stats.avg_confidence')}
            value={avgConfidenceOverall != null ? `${avgConfidenceOverall.toFixed(1)}/10` : '—'}
          />
          <StatCard label={t('stats.reasonings')} value={String(totalReasonings)} />
          <StatCard
            label={t('stats.to_fund')}
            accent
            value={`$${fundFormatted}`}
          />
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <BarChart3 className="h-4 w-4" />
            {t('actions.title')}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {showPulse ? (
              <ActionCard
                icon={<span className="text-xl">📊</span>}
                title={t('actions.create_pulse')}
                description={t('actions.create_pulse_desc')}
                href={atPulseLimit ? '#' : `/dashboard/sponsor/${token}/create-pulse`}
                cta={`${t('actions.create_pulse_cta')} →`}
                disabled={atPulseLimit}
              />
            ) : null}
            <ActionCard
              icon={<FileDown className="h-5 w-5 text-emerald-400" />}
              title={t('actions.reports')}
              description={t('actions.reports_desc')}
              href={`/dashboard/sponsor/${token}/reports`}
              cta={`${t('actions.reports_cta')} →`}
            />
            <ActionCard
              icon={<Share2 className="h-5 w-5 text-emerald-400" />}
              title={t('actions.share')}
              description={t('actions.share_desc')}
              href={`/dashboard/sponsor/${token}/share`}
              cta={`${t('actions.share_cta')} →`}
            />
            <ActionCard
              icon={<BookOpen className="h-5 w-5 text-emerald-400" />}
              title={t('actions.how_it_works')}
              description={t('actions.how_it_works_desc')}
              href={`/dashboard/sponsor/${token}/guide`}
              cta={`${t('actions.how_it_works_cta')} →`}
            />
          </div>
        </section>

        <SuggestCauseForm token={token} />

        <MyPulsesSection
          pulses={pulseRows}
          selectedPulse={selectedPulse}
          onSelect={setSelectedPulseId}
          onRefresh={() => router.refresh()}
          token={token}
          appOrigin={appOrigin}
          showPulse={showPulse}
          mxnLocale={mxnLocale}
          language={language}
        />

        {otherRows.length > 0 ? (
          <section>
            <h2 className="mb-4 border-b border-[#2d3748] pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
              {t('markets_list.other_title')}
            </h2>
            <div className="space-y-6">
              {otherRows.map((m) => (
                <div key={m.id}>
                  <SponsorMarketCard market={m} token={token} appOrigin={appOrigin} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {pulseRows.length === 0 && otherRows.length === 0 && !showPulse ? (
          <section>
            <h2 className="mb-4 border-b border-[#2d3748] pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
              {t('markets_list.title')}
            </h2>
            <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-8 text-center">
              <span className="text-3xl">📊</span>
              <p className="mt-3 font-medium text-white">{t('markets_list.empty_title')}</p>
              <p className="mt-1 text-sm text-slate-400">
                {t('markets_list.empty_desc_classic')}
              </p>
            </div>
          </section>
        ) : null}

        <SponsorEmailPreferences
          token={token}
          contactEmail={account.contact_email}
          initialPreferences={{
            pulse_launch:
              (account.email_preferences as Record<string, unknown> | null | undefined)?.pulse_launch === false
                ? false
                : true,
            pulse_closure:
              (account.email_preferences as Record<string, unknown> | null | undefined)?.pulse_closure === false
                ? false
                : true,
          }}
          initialLocale={account.locale === 'en' ? 'en' : 'es'}
        />

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            <Sparkles className="h-4 w-4 text-amber-400" />
            {t('fund_impact.title')}
          </h2>
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <p className="text-slate-300">{t('fund_impact.description')}</p>
            {fundTotal > 0 ? (
              <p className="mt-2 text-lg font-bold text-emerald-400">
                ${fundFormatted} MXN
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {t('fund_impact.estimated_cum')}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{t('fund_impact.empty')}</p>
            )}
            {fundImpactRows.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {fundImpactRows.slice(0, 8).map((row) => (
                  <li key={row.created_at + (row.description ?? '')}>
                    <span className="text-emerald-400/90">
                      ${Number(row.amount).toLocaleString(mxnLocale, { maximumFractionDigits: 0 })} MXN
                    </span>{' '}
                    — {row.description ?? t('fund_impact.fund_row_default')}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              href="/predictions/fund"
              className="mt-4 inline-block text-sm text-emerald-400 hover:underline"
            >
              {t('fund_impact.see_causes')} →
            </Link>
          </div>
        </section>

        <footer className="border-t border-[#2d3748] py-8 text-center text-sm text-slate-500">
          <p>{t('footer.need_help')}</p>
          <a href="mailto:comunidad@crowdconscious.app" className="font-medium text-emerald-400 hover:underline">
            comunidad@crowdconscious.app
          </a>
          <p className="mt-4 text-xs text-slate-600">
            {t('footer.powered_by')} · {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-[#2d3748] p-4 text-center ${
        accent ? 'bg-emerald-500/5' : 'bg-[#1a2029]'
      }`}
    >
      <div className={`text-2xl font-semibold ${accent ? 'text-emerald-400' : 'text-emerald-400'}`}>
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}

function ActionCard({
  icon,
  title,
  description,
  href,
  cta,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  cta: string
  disabled?: boolean
}) {
  const className = `flex flex-col rounded-xl border border-[#2d3748] bg-[#1a2029] p-5 transition ${
    disabled
      ? 'cursor-not-allowed opacity-50'
      : 'hover:border-emerald-500/30 hover:bg-[#1f2630]'
  }`
  const inner = (
    <>
      <div className="mb-2">{icon}</div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-400">{description}</p>
      <span className="mt-3 text-sm font-medium text-emerald-400">{cta}</span>
    </>
  )
  if (disabled) {
    return (
      <div className={className} role="group" aria-disabled>
        {inner}
      </div>
    )
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  )
}

type EnrichedMarket = SponsorDashboardMarketRow & {
  coverImageUrl: string | null
  displayTitle: string
}

const LIFECYCLE_PILL: Record<PulseLifecycle, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  closed: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  draft: 'bg-slate-700/60 text-slate-300 border border-slate-600/60',
}

function MyPulsesSection({
  pulses,
  selectedPulse,
  onSelect,
  onRefresh,
  token,
  appOrigin,
  showPulse,
  mxnLocale,
  language,
}: {
  pulses: EnrichedMarket[]
  selectedPulse: EnrichedMarket | null
  onSelect: (id: string) => void
  onRefresh: () => void
  token: string
  appOrigin: string
  showPulse: boolean
  mxnLocale: string
  language: Language
}) {
  const { t } = useSponsorT()

  // Sponsors with no Pulse entitlement (classic-only sponsors) skip this
  // entire section. The legacy "Tus mercados" empty state handles them.
  if (!showPulse && pulses.length === 0) return null

  if (pulses.length === 0) {
    return (
      <section className="rounded-xl border border-emerald-500/25 bg-[#1a2029] p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          {t('my_pulses.title')}
        </h2>
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#2d3748] bg-[#0f1419] p-8 text-center">
          <span className="text-3xl">🫧</span>
          <p className="font-medium text-white">{t('my_pulses.no_assigned_title')}</p>
          <p className="text-sm text-slate-400">{t('my_pulses.no_assigned_desc')}</p>
          <a
            href="mailto:comunidad@crowdconscious.app"
            className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {t('my_pulses.no_assigned_cta')}
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-emerald-500/25 bg-[#1a2029] p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            {t('my_pulses.title')}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{t('my_pulses.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-xs font-semibold text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('my_pulses.refresh')}
        </button>
      </div>

      {pulses.length > 1 ? (
        <div className="mt-4 -mx-1 flex flex-wrap gap-2 px-1">
          {pulses.map((p) => {
            const lifecycle = pulseLifecycleFromMarket({
              status: p.status,
              isDraft: p.isDraft,
              resolutionDate: p.resolutionDate,
            })
            const meta = PULSE_LIFECYCLE_LABELS[lifecycle]
            const lifecycleLabel = `${meta.emoji} ${language === 'en' ? meta.en : meta.es}`
            const isSelected = selectedPulse?.id === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                    : 'border-[#2d3748] bg-[#0f1419] text-slate-300 hover:border-emerald-500/30'
                }`}
                aria-pressed={isSelected}
              >
                <span className="text-sm font-semibold">{p.displayTitle}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className={`rounded-full px-2 py-0.5 ${LIFECYCLE_PILL[lifecycle]}`}>
                    {lifecycleLabel}
                  </span>
                  <span>
                    {p.totalVotes.toLocaleString(mxnLocale)} {t('my_pulses.votes_short')}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">
          {t('my_pulses.showing_data_for')}{' '}
          <span className="font-semibold text-slate-300 normal-case">
            {selectedPulse?.displayTitle}
          </span>
        </p>
      )}

      {selectedPulse ? (
        <div className="mt-6">
          <SponsorMarketCard
            market={selectedPulse}
            token={token}
            appOrigin={appOrigin}
          />
          {selectedPulse.totalVotes > 0 ? (
            <PulseMarketAnalytics market={selectedPulse} />
          ) : (
            <PulseNoVotesYet
              isClosed={pulseLifecycleFromMarket({
                status: selectedPulse.status,
                isDraft: selectedPulse.isDraft,
                resolutionDate: selectedPulse.resolutionDate,
              }) === 'closed'}
              onRefresh={onRefresh}
            />
          )}
        </div>
      ) : null}
    </section>
  )
}

function PulseNoVotesYet({
  isClosed,
  onRefresh,
}: {
  isClosed: boolean
  onRefresh: () => void
}) {
  const { t } = useSponsorT()
  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-[#0f1419]/80 p-8 text-center">
      {!isClosed ? (
        <span className="relative inline-flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
      ) : (
        <span className="text-2xl">📭</span>
      )}
      <p className="text-base font-semibold text-white">
        {isClosed ? t('my_pulses.closed_no_votes_title') : t('my_pulses.no_votes_title')}
      </p>
      <p className="max-w-md text-sm text-slate-400">
        {isClosed ? t('my_pulses.closed_no_votes_desc') : t('my_pulses.no_votes_desc')}
      </p>
      {!isClosed ? (
        <button
          type="button"
          onClick={onRefresh}
          className="mt-1 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('my_pulses.refresh')}
        </button>
      ) : null}
    </div>
  )
}

function PulseMarketAnalytics({ market }: { market: SponsorDashboardMarketRow }) {
  const { t } = useSponsorT()
  const maxBucket = Math.max(1, ...market.confidenceBuckets)
  const chartData = market.votesByDay.map((d) => ({
    date: d.date,
    votos: d.count,
  }))

  return (
    <div className="mt-4 space-y-6 rounded-xl border border-[#2d3748] bg-[#0f1419]/80 p-5">
      <div>
        <h4 className="mb-2 text-sm font-medium text-slate-300">
          {t('charts.confidence_dist_title')}
        </h4>
        <div className="flex h-28 items-end gap-1">
          {market.confidenceBuckets.map((c, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-emerald-500/70"
                style={{ height: `${(c / maxBucket) * 100}%`, minHeight: c > 0 ? 4 : 0 }}
              />
              <span className="text-[10px] text-slate-500">{i + 1}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {t('charts.strong_opinions')}: {market.strongOpinionCount}
        </p>
      </div>

      {chartData.length > 0 ? (
        <div>
          <h4 className="mb-2 text-sm font-medium text-slate-300">
            {t('charts.votes_over_time')}
          </h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1a2029', border: '1px solid #2d3748' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="votos"
                  stroke="#34d399"
                  fill="rgba(52, 211, 153, 0.25)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-sm font-medium text-slate-300">
          {t('charts.avg_conf_by_outcome')}
        </h4>
        <ul className="space-y-1 text-sm text-slate-400">
          {market.avgConfidenceByOutcome.map((o) => (
            <li key={o.outcomeId} className="flex justify-between gap-4">
              <span>{o.label}</span>
              <span className="text-emerald-400/90">
                {o.count > 0
                  ? `${o.avg.toFixed(1)}/10 (${o.count} ${t('charts.votes')})`
                  : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
