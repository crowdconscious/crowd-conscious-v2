'use client'

import { useState } from 'react'
import { toDisplayPercent } from '@/lib/probability-utils'
import {
  Globe,
  Building2,
  Briefcase,
  Users,
  Heart,
  Trophy,
  Leaf,
  ChevronDown,
  Mail,
  ExternalLink,
} from 'lucide-react'
import { SponsorCheckoutModal } from './SponsorCheckoutModal'
import Logo from '@/components/Logo'
import { getMarketText } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'
import { daysUntilWorldCup } from '@/lib/world-cup-kickoff'
import { SPONSOR_TIERS, type SponsorTierId } from '@/lib/sponsor-tiers'
import {
  sponsorPageCopy as t,
  sponsorLang,
  sponsorCategoryLabel,
  sponsorMailtoQuery,
} from '@/lib/i18n/sponsor-page-copy'

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ElementType; bg: string; text: string }
> = {
  world: { icon: Globe, bg: 'bg-blue-500/20', text: 'text-blue-400' },
  government: { icon: Building2, bg: 'bg-red-500/20', text: 'text-red-400' },
  corporate: { icon: Briefcase, bg: 'bg-purple-500/20', text: 'text-purple-400' },
  community: { icon: Users, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  cause: { icon: Heart, bg: 'bg-amber-500/20', text: 'text-amber-400' },
  world_cup: { icon: Trophy, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  sustainability: { icon: Leaf, bg: 'bg-green-500/20', text: 'text-green-400' },
}

const SPONSOR_EMAIL = 'comunidad@crowdconscious.app'

type Market = {
  id: string
  title: string
  category: string
  current_probability?: number
  total_votes?: number
  sponsor_name?: string | null
  sponsor_logo_url?: string | null
  sponsor_url?: string | null
}

type LeadingOutcomes = Record<string, { label: string; probability: number }>

interface Props {
  unsponsored: Market[]
  sponsored: Market[]
  leadingOutcomes: LeadingOutcomes
}

export function SponsorPageClient({
  unsponsored,
  sponsored,
  leadingOutcomes,
}: Props) {
  const locale = useLocale()
  const lang = sponsorLang(locale)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [modal, setModal] = useState<{
    open: boolean
    tier: SponsorTierId
    tierLabel: string
    marketId?: string
    marketTitle?: string
    category?: string
  }>({ open: false, tier: 'starter', tierLabel: 'Market Sponsor' })

  const openModal = (
    tier: SponsorTierId,
    tierLabel: string,
    opts?: { marketId?: string; marketTitle?: string; category?: string }
  ) => {
    setModal({
      open: true,
      tier,
      tierLabel,
      marketId: opts?.marketId,
      marketTitle: opts?.marketTitle,
      category: opts?.category,
    })
  }

  const previewMarketId = unsponsored[0]?.id ?? sponsored[0]?.id

  return (
    <>
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                {t.heroTitle[lang]}
              </h1>
              <p className="text-lg md:text-xl text-amber-400/90 mb-2">
                ⚽{' '}
                {lang === 'es'
                  ? `${daysUntilWorldCup()} días para el partido inaugural en el Estadio Azteca`
                  : `${daysUntilWorldCup()} days until the opening match at Estadio Azteca`}
              </p>
              <p className="text-xl md:text-2xl text-cc-text-secondary max-w-2xl mx-auto">
                {t.heroSubtitle[lang]}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <a
                href="#markets"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
              >
                {t.browseCta[lang]}
                <ChevronDown className="w-5 h-5" />
              </a>
              <a
                href={sponsorMailtoQuery(undefined, undefined, lang)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-cc-border hover:border-cc-border-light text-gray-200 font-semibold transition-colors"
              >
                {t.contactCta[lang]}
              </a>
            </div>
            {/* Sponsored market card mockup */}
            <div className="max-w-md mx-auto">
              <p className="text-cc-text-muted text-sm text-center mb-3">{t.cardMockupCaption[lang]}</p>
              <div className="border border-cc-border bg-cc-card/90 rounded-2xl overflow-hidden shadow-xl shadow-emerald-500/5">
                {previewMarketId ? (
                  <>
                    <img
                      src={`/api/og/market/${previewMarketId}`}
                      alt="Sponsored market card preview"
                      className="w-full h-auto"
                    />
                    <div className="px-4 py-2 border-t border-cc-border bg-gray-800/80 flex items-center justify-between">
                      <span className="text-cc-text-muted text-xs">{t.sponsoredBy[lang]}</span>
                      <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-medium">You</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <Logo size="sm" linkTo="" className="[&_img]:max-h-6" />
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                          {t.mockCardNoOg.tag[lang]}
                        </span>
                      </div>
                      <p className="text-white font-semibold text-lg">
                        {t.mockCardNoOg.title[lang]}
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-cc-text-muted text-xs">{t.mockCardNoOg.consensus[lang]}</p>
                          <p className="text-emerald-400 font-bold text-2xl">{t.mockCardNoOg.yes[lang]}</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-2 border-t border-cc-border bg-gray-800/80 flex items-center justify-between">
                      <span className="text-cc-text-muted text-xs">{t.sponsoredBy[lang]}</span>
                      <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-medium">You</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-20 px-4 border-t border-cc-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
              {t.whyTitle[lang]}
            </h2>
            <p className="text-cc-text-secondary text-center mb-12 max-w-2xl mx-auto">
              {t.whyIntro[lang]}
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold text-emerald-400">94%</p>
                <p className="text-cc-text-secondary text-sm mt-1">{t.stat94[lang]}</p>
                <p className="text-cc-text-muted text-xs mt-2">{t.stat94Note[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold text-emerald-400">2.2B+</p>
                <p className="text-cc-text-secondary text-sm mt-1">{t.stat22b[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6 text-center">
                <p className="text-cc-text-secondary text-sm">{t.statMx[lang]}</p>
              </div>
            </div>
          </div>
        </section>

        {/* How Sponsorship Works */}
        <section className="py-16 px-4 border-t border-cc-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-12">
              {t.howTitle[lang]}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-emerald-400">1</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t.step1Title[lang]}</h3>
                <p className="text-cc-text-secondary text-sm">{t.step1Desc[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-emerald-400">2</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t.step2Title[lang]}</h3>
                <p className="text-cc-text-secondary text-sm">{t.step2Desc[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-emerald-400">3</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t.step3Title[lang]}</h3>
                <p className="text-cc-text-secondary text-sm">{t.step3Desc[lang]}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Sponsorship Tiers */}
        <section className="py-20 px-4 border-t border-cc-border">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
              {t.tiersSectionTitle[lang]}
            </h2>
            <p className="text-cc-text-secondary text-center mb-4 max-w-2xl mx-auto">
              {t.tiersIntro[lang]}
            </p>
            <p className="text-emerald-400/90 text-center text-sm mb-12 max-w-xl mx-auto">
              {t.fundBanner[lang]}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-1">{t.tierNames.starter[lang]}</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-1">
                  ${SPONSOR_TIERS.starter.price.toLocaleString()} MXN (~$150 USD)
                </p>
                <span className="text-emerald-400 text-sm font-medium mb-3 block">
                  {lang === 'es'
                    ? `Incluye ${Math.round(SPONSOR_TIERS.starter.fundPercent * 100)}% al Fondo Consciente`
                    : `Includes ${Math.round(SPONSOR_TIERS.starter.fundPercent * 100)}% to Conscious Fund`}
                </span>
                <ul className="text-gray-300 text-sm space-y-2 mb-4 flex-1">
                  {t.starterFeatures[lang].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="text-cc-text-muted text-xs mb-3 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-500/80" />
                  {t.includesFund[lang]}
                </p>
                <p className="text-cc-text-muted text-xs mb-4">{t.tierStarterBest[lang]}</p>
                <button
                  type="button"
                  onClick={() => openModal('starter', t.tierNames.starter[lang])}
                  className="block w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors"
                >
                  {t.sponsorNow[lang]}
                </button>
              </div>

              <div className="border-2 border-emerald-500/40 bg-cc-card/80 rounded-xl p-6 flex flex-col relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  {t.mostPopular[lang]}
                </span>
                <h3 className="text-lg font-bold text-white mb-1">{t.tierNames.growth[lang]}</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-1">
                  ${SPONSOR_TIERS.growth.price.toLocaleString()} MXN (~$500 USD)
                </p>
                <span className="text-emerald-400 text-sm font-medium mb-3 block">
                  {lang === 'es'
                    ? `Incluye ${Math.round(SPONSOR_TIERS.growth.fundPercent * 100)}% al Fondo Consciente`
                    : `Includes ${Math.round(SPONSOR_TIERS.growth.fundPercent * 100)}% to Conscious Fund`}
                </span>
                <ul className="text-gray-300 text-sm space-y-2 mb-4 flex-1">
                  {t.growthFeatures[lang].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="text-cc-text-muted text-xs mb-3 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-500/80" />
                  {t.includesFund[lang]}
                </p>
                <p className="text-cc-text-muted text-xs mb-4">{t.tierGrowthBest[lang]}</p>
                <button
                  type="button"
                  onClick={() => openModal('growth', t.tierNames.growth[lang])}
                  className="block w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors"
                >
                  {t.sponsorNow[lang]}
                </button>
              </div>

              <div className="border-2 border-amber-500/40 bg-cc-card/80 rounded-xl p-6 flex flex-col shadow-lg shadow-amber-500/5">
                <h3 className="text-lg font-bold text-white mb-1">{t.tierNames.champion[lang]}</h3>
                <p className="text-2xl font-bold text-amber-400 mb-1">
                  ${SPONSOR_TIERS.champion.price.toLocaleString()} MXN (~$1,250 USD)
                </p>
                <span className="text-emerald-400 text-sm font-medium mb-3 block">
                  {lang === 'es'
                    ? `Incluye ${Math.round(SPONSOR_TIERS.champion.fundPercent * 100)}% al Fondo Consciente`
                    : `Includes ${Math.round(SPONSOR_TIERS.champion.fundPercent * 100)}% to Conscious Fund`}
                </span>
                <ul className="text-gray-300 text-sm space-y-2 mb-4 flex-1">
                  {t.championFeatures[lang].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="text-cc-text-muted text-xs mb-3 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-500/80" />
                  {t.includesFund[lang]}
                </p>
                <p className="text-cc-text-muted text-xs mb-4">{t.tierChampionBest[lang]}</p>
                <button
                  type="button"
                  onClick={() => openModal('champion', t.tierNames.champion[lang])}
                  className="block w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-center text-sm font-medium transition-colors"
                >
                  {t.sponsorNow[lang]}
                </button>
              </div>

              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-1">{t.tierNames.anchor[lang]}</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-1">
                  ${SPONSOR_TIERS.anchor.price.toLocaleString()} MXN (~$3,000 USD)
                </p>
                <span className="text-emerald-400 text-sm font-medium mb-2 block">
                  {lang === 'es'
                    ? `Incluye ${Math.round(SPONSOR_TIERS.anchor.fundPercent * 100)}% al Fondo Consciente`
                    : `Includes ${Math.round(SPONSOR_TIERS.anchor.fundPercent * 100)}% to Conscious Fund`}
                </span>
                <p className="text-amber-400/90 text-xs font-medium mb-2">{t.limitedPatrons[lang]}</p>
                <ul className="text-gray-300 text-sm space-y-2 mb-4 flex-1">
                  {t.anchorFeatures[lang].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="text-cc-text-muted text-xs mb-3 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-500/80" />
                  {t.includesFund[lang]}
                </p>
                <p className="text-cc-text-muted text-xs mb-4">{t.tierAnchorBest[lang]}</p>
                <button
                  type="button"
                  onClick={() => openModal('anchor', t.tierNames.anchor[lang])}
                  className="block w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors"
                >
                  {t.sponsorNow[lang]}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Available Markets */}
        <section id="markets" className="py-16 px-4 border-t border-cc-border">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">{t.availableTitle[lang]}</h2>
            <p className="text-cc-text-secondary mb-8">{t.availableDesc[lang]}</p>

            {unsponsored.length === 0 ? (
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-12 text-center">
                <p className="text-cc-text-secondary">{t.emptyUnsponsored[lang]}</p>
                <a
                  href={sponsorMailtoQuery(undefined, undefined, lang)}
                  className="inline-flex items-center gap-2 mt-4 text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  {t.contactCta[lang]}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-cc-text-muted text-sm mr-2">{t.filterLabel[lang]}</span>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      categoryFilter === 'all' ? 'bg-emerald-600 text-white' : 'border border-cc-border-light bg-gray-800 text-cc-text-secondary hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {t.filterAll[lang]}
                  </button>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setCategoryFilter(key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          categoryFilter === key ? `${config.bg} ${config.text} border border-current` : 'border border-cc-border-light bg-gray-800 text-cc-text-secondary hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {sponsorCategoryLabel(key, lang)}
                      </button>
                    )
                  })}
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...unsponsored]
                  .filter((m) => categoryFilter === 'all' || m.category === categoryFilter)
                  .sort((a, b) => (b.total_votes ?? 0) - (a.total_votes ?? 0))
                  .map((m) => {
                  const config = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.world
                  const Icon = config.icon
                  const leading = leadingOutcomes[m.id]
                  const prob = leading
                    ? Math.round(toDisplayPercent(leading.probability))
                    : Math.round(toDisplayPercent(Number(m.current_probability))) || 50
                  const label = leading?.label ?? 'YES'
                  const votes = m.total_votes ?? 0
                  const isHot = votes >= 3

                  return (
                    <div
                      key={m.id}
                      className="border border-cc-border bg-cc-card/80 rounded-xl p-5 flex flex-col"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium w-fit ${config.bg} ${config.text}`}
                        >
                          <Icon className="w-3 h-3" />
                          {sponsorCategoryLabel(m.category, lang)}
                        </span>
                        {isHot && (
                          <span className="text-amber-400 text-xs font-medium">{t.hot[lang]}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white mt-3 line-clamp-2">{m.title}</h3>
                      <p className="text-emerald-400 font-bold text-lg mt-2">
                        {votes} {t.predictions[lang]}
                      </p>
                      <p className="text-emerald-400/80 text-sm mt-0.5">
                        {label} {prob}%
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          openModal('starter', t.tierNames.starter[lang], {
                            marketId: m.id,
                            marketTitle: m.title,
                            category: m.category,
                          })
                        }
                        className="mt-4 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors"
                      >
                        {t.sponsorThis[lang]}
                      </button>
                    </div>
                  )
                })}
              </div>
              </>
            )}
          </div>
        </section>

        {/* Current Sponsors */}
        <section className="py-16 px-4 border-t border-cc-border">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">{t.currentSponsorsTitle[lang]}</h2>

            {sponsored.length === 0 ? (
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-12 text-center">
                <p className="text-cc-text-secondary">{t.emptySponsored[lang]}</p>
                <button
                  type="button"
                  onClick={() => openModal('starter', t.tierNames.starter[lang])}
                  className="inline-flex items-center gap-2 mt-4 text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  {t.sponsorNow[lang]}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sponsored.map((m) => (
                  <div
                    key={m.id}
                    className="border border-cc-border bg-cc-card/80 rounded-xl p-5 flex items-center gap-4"
                  >
                    {m.sponsor_logo_url ? (
                      <img
                        src={m.sponsor_logo_url}
                        alt={m.sponsor_name || ''}
                        className="w-16 h-16 object-contain rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded bg-gray-700 flex items-center justify-center text-2xl">
                        {m.sponsor_name?.[0] || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{m.sponsor_name}</p>
                      <p className="text-cc-text-secondary text-sm truncate">{getMarketText(m, 'title', locale)}</p>
                      {m.sponsor_url && (
                        <a
                          href={m.sponsor_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 text-sm hover:underline flex items-center gap-1 mt-1"
                        >
                          {t.visit[lang]} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 border-t border-cc-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
              {t.faqTitle[lang]}
            </h2>
            <div className="space-y-6">
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{t.faq1q[lang]}</h3>
                <p className="text-cc-text-secondary text-sm">{t.faq1a[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{t.faq2q[lang]}</h3>
                <p className="text-cc-text-secondary text-sm">{t.faq2a[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{t.faq3q[lang]}</h3>
                <p className="text-cc-text-secondary text-sm">{t.faq3a[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{t.faq4q[lang]}</h3>
                <p className="text-cc-text-secondary text-sm">{t.faq4a[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{t.faq5q[lang]}</h3>
                <p className="text-cc-text-secondary text-sm">{t.faq5a[lang]}</p>
              </div>
            </div>
          </div>
        </section>

        {/* For Influencers */}
        <section className="py-16 px-4 border-t border-cc-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">{t.influencerTitle[lang]}</h2>
            <p className="text-cc-text-secondary mb-6">{t.influencerBody[lang]}</p>
            <a
              href={sponsorMailtoQuery(undefined, lang === 'es' ? 'Individual' : 'Individual', lang)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 font-medium transition-colors"
            >
              {t.influencerCta[lang]}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Testimonials / Social Proof */}
        <section className="py-16 px-4 border-t border-cc-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-6">{t.wcTitle[lang]}</h2>
            <p className="text-cc-text-secondary mb-8">{t.wcSubtitle[lang]}</p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6">
                <p className="text-3xl font-bold text-emerald-400">5</p>
                <p className="text-cc-text-secondary text-sm mt-1">{t.wcStat1[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6">
                <p className="text-3xl font-bold text-emerald-400">100K+</p>
                <p className="text-cc-text-secondary text-sm mt-1">{t.wcStat2[lang]}</p>
              </div>
              <div className="border border-cc-border bg-cc-card/80 rounded-xl p-6">
                <p className="text-3xl font-bold text-emerald-400">48</p>
                <p className="text-cc-text-secondary text-sm mt-1">{t.wcStat3[lang]}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-24 px-4 border-t border-cc-border">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t.ctaTitle[lang]}</h2>
            <p className="text-cc-text-secondary mb-8">{t.ctaBody[lang]}</p>
            <div className="flex justify-center">
              <a
                href={sponsorMailtoQuery(undefined, undefined, lang)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
              >
                <Mail className="w-5 h-5" />
                {t.emailUs[lang]}
              </a>
            </div>
            <p className="text-cc-text-muted text-sm mt-6">
              <a href={`mailto:${SPONSOR_EMAIL}`} className="text-emerald-400 hover:underline">{SPONSOR_EMAIL}</a>
            </p>
          </div>
        </section>
      </main>

      <SponsorCheckoutModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        tier={modal.tier}
        tierLabel={modal.tierLabel}
        marketId={modal.marketId}
        marketTitle={modal.marketTitle}
        category={modal.category}
      />
    </>
  )
}
