'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Crown, Mail, Sparkles } from 'lucide-react'
import { useSponsorT } from '@/lib/i18n/sponsor-dashboard'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SponsorUpgradeTier, UpgradeCardRole } from '@/lib/sponsor-upgrade-tier'
import type { PulseTierId } from '@/lib/pulse-tiers'

type CardSnapshot = {
  target: PulseTierId
  role: UpgradeCardRole
  highlighted: boolean
  name: string
  priceMXN: number
  fundPercent: number
  durationLabel: string
  features: readonly string[]
  bestFor: string
  contactOnly: boolean
}

type Props = {
  token: string
  locale: 'es' | 'en'
  tier: SponsorUpgradeTier
  companyName: string
  contactEmail: string
  usedPulseMarkets: number
  maxPulseMarkets: number
  cards: CardSnapshot[]
}

const ENTERPRISE_EMAIL = 'comunidad@crowdconscious.app'

export function SponsorUpgradeClient({
  token,
  locale,
  tier,
  companyName,
  contactEmail,
  usedPulseMarkets,
  maxPulseMarkets,
  cards,
}: Props) {
  const { t } = useSponsorT()
  const { setLanguage } = useLanguage()
  const [loadingTarget, setLoadingTarget] = useState<PulseTierId | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Keep the sponsor dashboard's language toggle honored on this page.
  // SSR picked locale from the cookie — sync the context on mount so the
  // toggle in the main dashboard header stays consistent when the user
  // clicks "Back to dashboard".
  useEffect(() => {
    setLanguage(locale)
  }, [locale, setLanguage])

  const subtitle = useMemo(() => {
    switch (tier) {
      case 'pulse_unico':
        return t('upgrade.subtitle_pulse_unico')
      case 'pulse_pack': {
        const max = Math.max(1, maxPulseMarkets || 3)
        if (usedPulseMarkets >= max) {
          return t('upgrade.subtitle_pulse_pack_full', { max, used: usedPulseMarkets })
        }
        return t('upgrade.subtitle_pulse_pack_under', { max, used: usedPulseMarkets })
      }
      case 'suscripcion':
        return t('upgrade.subtitle_suscripcion')
      case 'mundial_pack':
      case 'mundial_pack_founding':
        return t('upgrade.subtitle_mundial')
      case 'enterprise':
        return t('upgrade.subtitle_enterprise')
      case 'pilot':
        return t('upgrade.subtitle_pilot')
      case 'legacy_sponsor':
      default:
        return t('upgrade.subtitle_legacy')
    }
  }, [tier, usedPulseMarkets, maxPulseMarkets, t])

  const startCheckout = async (target: PulseTierId) => {
    setErr(null)
    setLoadingTarget(target)
    try {
      const res = await fetch('/api/sponsor/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, target_tier: target }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        setErr(typeof data.error === 'string' ? data.error : t('upgrade.cta_error_generic'))
        return
      }
      window.location.href = data.url as string
    } catch {
      setErr(t('upgrade.cta_error_generic'))
    } finally {
      setLoadingTarget(null)
    }
  }

  const enterpriseMailto = useMemo(() => {
    const subject = encodeURIComponent(
      locale === 'en'
        ? `Interest in Enterprise — ${companyName}`
        : `Interés en Enterprise — ${companyName}`
    )
    const body = encodeURIComponent(
      locale === 'en'
        ? `Hi, I'd like to discuss an Enterprise plan for ${companyName}. Contact on file: ${contactEmail}.`
        : `Hola, me gustaría hablar sobre un plan Enterprise para ${companyName}. Contacto en archivo: ${contactEmail}.`
    )
    return `mailto:${ENTERPRISE_EMAIL}?subject=${subject}&body=${body}`
  }, [locale, companyName, contactEmail])

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <Link
          href={`/dashboard/sponsor/${token}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('upgrade.back_to_dashboard')}
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t('upgrade.page_title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{subtitle}</p>
        </header>

        {err ? (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {err}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, idx) => (
            <UpgradeCard
              key={`${card.target}-${card.role}-${idx}`}
              card={card}
              locale={locale}
              usage={{ used: usedPulseMarkets, max: maxPulseMarkets }}
              loading={loadingTarget === card.target}
              disabled={loadingTarget !== null && loadingTarget !== card.target}
              onCheckout={() => void startCheckout(card.target)}
              enterpriseMailto={enterpriseMailto}
              t={t}
            />
          ))}
        </div>

        {/* Add-on: placeholder surface so the sponsor knows we're not
            ignoring their request for extra questions. Wires to the
            proper add-on flow in a follow-up. */}
        {tier === 'suscripcion' ? (
          <div className="mt-10 rounded-xl border border-[#2d3748] bg-[#11161c] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-4 w-4 text-amber-400" />
              {t('upgrade.addon_title')}
            </h2>
            <p className="mt-2 text-sm text-slate-400">{t('upgrade.addon_body')}</p>
            <a
              href={enterpriseMailto}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#2d3748] px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              <Mail className="h-4 w-4" />
              {t('upgrade.addon_cta')}
            </a>
          </div>
        ) : null}

        <div className="mt-10 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <h2 className="text-lg font-semibold text-white">{t('upgrade.need_help_title')}</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300">{t('upgrade.need_help_body')}</p>
          <a
            href={enterpriseMailto}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            <Mail className="h-4 w-4" />
            {t('upgrade.need_help_cta')}
          </a>
        </div>
      </div>
    </div>
  )
}

function UpgradeCard({
  card,
  locale,
  usage,
  loading,
  disabled,
  onCheckout,
  enterpriseMailto,
  t,
}: {
  card: CardSnapshot
  locale: 'es' | 'en'
  usage: { used: number; max: number }
  loading: boolean
  disabled: boolean
  onCheckout: () => void
  enterpriseMailto: string
  t: ReturnType<typeof useSponsorT>['t']
}) {
  const price = card.priceMXN > 0
    ? new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      }).format(card.priceMXN)
    : null
  const isEnterprise = card.role === 'enterprise'
  const isCurrent = card.role === 'current'
  const cardBorder = card.highlighted
    ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
    : 'border-[#2d3748]'
  const badge = isCurrent
    ? { label: t('upgrade.badge_current'), cls: 'bg-slate-700 text-slate-100' }
    : card.role === 'renew'
      ? { label: t('upgrade.badge_renew'), cls: 'bg-amber-600/20 text-amber-300' }
      : card.role === 'upgrade' && card.highlighted
        ? { label: t('upgrade.badge_recommended'), cls: 'bg-emerald-500/20 text-emerald-300' }
        : card.role === 'upgrade'
          ? { label: t('upgrade.badge_upgrade'), cls: 'bg-emerald-500/10 text-emerald-300' }
          : null

  const cta = (() => {
    if (isEnterprise) {
      return (
        <a
          href={enterpriseMailto}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-purple-500/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500"
        >
          <Mail className="h-4 w-4" />
          {t('upgrade.cta_contact_enterprise')}
        </a>
      )
    }
    if (isCurrent) {
      return (
        <button
          type="button"
          disabled
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-2.5 text-sm font-medium text-slate-400"
        >
          <Crown className="h-4 w-4" />
          {t('upgrade.cta_current_plan')}
        </button>
      )
    }
    const label =
      card.target === 'pulse_unico'
        ? t('upgrade.cta_buy_pulse_unico')
        : card.target === 'pulse_pack'
          ? card.role === 'renew'
            ? t('upgrade.cta_renew_pack')
            : t('upgrade.cta_buy_pulse_pack')
          : t('upgrade.cta_activate_suscripcion')
    return (
      <button
        type="button"
        onClick={onCheckout}
        disabled={loading || disabled}
        className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
          card.highlighted
            ? 'bg-emerald-500 hover:bg-emerald-400'
            : 'bg-slate-700 hover:bg-slate-600'
        }`}
      >
        {loading ? t('upgrade.cta_loading') : label}
      </button>
    )
  })()

  const fundPctLabel = Math.round(card.fundPercent * 100)

  return (
    <article
      className={`flex flex-col justify-between rounded-2xl border bg-[#11161c] p-6 ${cardBorder}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xl font-bold text-white">{card.name}</h3>
          {badge ? (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}
            >
              {badge.label}
            </span>
          ) : null}
        </div>

        {/* Usage stat only on the "current" card for Pulse Pack tier —
            shows the running N/3 count so the sponsor sees why renewing
            or upgrading is relevant right now. */}
        {isCurrent && card.target === 'pulse_pack' ? (
          <p className="mt-2 text-xs text-slate-400">
            {t('upgrade.usage_card_title')}:{' '}
            <span className="font-semibold text-slate-200">
              {t('upgrade.usage_value', {
                used: usage.used,
                max: usage.max >= 999 ? t('upgrade.usage_unlimited') : usage.max,
              })}
            </span>
          </p>
        ) : null}

        {price ? (
          <p className="mt-3 text-2xl font-bold text-emerald-400">
            {price}
            <span className="ml-1 text-sm font-normal text-slate-400">MXN</span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            {locale === 'en' ? 'Custom quote' : 'Cotización a la medida'}
          </p>
        )}

        <dl className="mt-4 space-y-1 text-xs text-slate-400">
          {card.durationLabel ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-slate-500">{t('upgrade.card_duration')}:</dt>
              <dd>{card.durationLabel}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">{t('upgrade.card_fund')}:</dt>
            <dd>{fundPctLabel}%</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">{t('upgrade.card_best_for')}:</dt>
            <dd>{card.bestFor}</dd>
          </div>
        </dl>

        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          {card.features.slice(0, 5).map((feat) => (
            <li key={feat} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">{cta}</div>
    </article>
  )
}
