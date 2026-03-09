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

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string }
> = {
  world: { label: 'World', icon: Globe, bg: 'bg-blue-500/20', text: 'text-blue-400' },
  government: { label: 'Government', icon: Building2, bg: 'bg-red-500/20', text: 'text-red-400' },
  corporate: { label: 'Corporate', icon: Briefcase, bg: 'bg-purple-500/20', text: 'text-purple-400' },
  community: { label: 'Community', icon: Users, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  cause: { label: 'Cause', icon: Heart, bg: 'bg-amber-500/20', text: 'text-amber-400' },
  world_cup: { label: 'World Cup', icon: Trophy, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  sustainability: { label: 'Sustainability', icon: Leaf, bg: 'bg-green-500/20', text: 'text-green-400' },
}

const SPONSOR_EMAIL = 'comunidad@crowdconscious.app'

function sponsorMailto(marketTitle?: string, tier?: string) {
  const subject = encodeURIComponent('Sponsorship Inquiry - Crowd Conscious')
  const body = encodeURIComponent(
    `Hi, I'm interested in sponsoring a market on Crowd Conscious.\n\n` +
      `Market: ${marketTitle || '(not specified)'}\n` +
      `Tier: ${tier || '(not specified)'}\n` +
      `Company/Name: \n`
  )
  return `mailto:${SPONSOR_EMAIL}?subject=${subject}&body=${body}`
}

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
  const [modal, setModal] = useState<{
    open: boolean
    tier: 'market' | 'category' | 'impact' | 'patron'
    tierLabel: string
    marketId?: string
    marketTitle?: string
    category?: string
  }>({ open: false, tier: 'market', tierLabel: 'Market Sponsor' })

  const openModal = (
    tier: 'market' | 'category' | 'impact' | 'patron',
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
                Put Your Brand in Front of the World Cup
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto">
                Sponsor a prediction market. Engage millions of fans. Fund real social impact.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <a
                href="#markets"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
              >
                Browse Available Markets
                <ChevronDown className="w-5 h-5" />
              </a>
              <a
                href={sponsorMailto()}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-200 font-semibold transition-colors"
              >
                Contact Us
              </a>
            </div>
            {/* Sponsored market card mockup */}
            <div className="max-w-md mx-auto">
              <p className="text-slate-500 text-sm text-center mb-3">Your brand on a market card</p>
              <div className="bg-slate-900/80 border border-slate-700 rounded-2xl overflow-hidden shadow-xl shadow-emerald-500/5">
                {previewMarketId ? (
                  <>
                    <img
                      src={`/api/og/market/${previewMarketId}`}
                      alt="Sponsored market card preview"
                      className="w-full h-auto"
                    />
                    <div className="px-4 py-2 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between">
                      <span className="text-slate-500 text-xs">Sponsored by</span>
                      <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-medium">You</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <Logo size="sm" linkTo="" className="[&_img]:max-h-6" />
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">⚽ World Cup</span>
                      </div>
                      <p className="text-white font-semibold text-lg">
                        Will Mexico win the opening match at Estadio Azteca?
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-slate-500 text-xs">Current crowd consensus</p>
                          <p className="text-emerald-400 font-bold text-2xl">42% Yes</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between">
                      <span className="text-slate-500 text-xs">Sponsored by</span>
                      <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-medium">You</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-20 px-4 border-t border-slate-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
              Why Prediction Markets?
            </h2>
            <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
              Prediction markets have proven remarkably accurate at forecasting real-world events.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold text-emerald-400">94%</p>
                <p className="text-slate-400 text-sm mt-1">accurate at forecasting events</p>
                <p className="text-slate-500 text-xs mt-2">Polymarket, academic research</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold text-emerald-400">2.2B+</p>
                <p className="text-slate-400 text-sm mt-1">World Cup viewers expected in 2026</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">
                  Mexico City hosts the opening match — the global spotlight will be here
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How Sponsorship Works */}
        <section className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-12">
              How Sponsorship Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-emerald-400">1</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Choose a Market</h3>
                <p className="text-slate-400 text-sm">
                  Pick from our active prediction markets — World Cup matches, sustainability goals,
                  policy outcomes, city events. Or propose a custom market that aligns with your
                  brand.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-emerald-400">2</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Your Brand, Front & Center</h3>
                <p className="text-slate-400 text-sm">
                  Your logo and name appear on the market card, detail page, and results. Link to
                  your website, social media, or campaign. Every user who predicts sees your brand.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-emerald-400">3</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Fund Real Impact</h3>
                <p className="text-slate-400 text-sm">
                  80% of your sponsorship goes directly to the Conscious Fund. Users vote on which
                  community causes receive grants. Your brand gets credited for the impact.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sponsorship Tiers */}
        <section className="py-20 px-4 border-t border-slate-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
              Sponsorship Tiers
            </h2>
            <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
              Clean pricing. Every tier includes a Conscious Fund donation.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-1">Market Sponsor</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-2">$2,000 MXN (~$100 USD)</p>
                <ul className="text-slate-300 text-sm space-y-2 mb-4 flex-1">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Logo on one market card + detail page
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Link to your website/social
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Mentioned in market resolution post
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    &quot;Sponsored by [Brand]&quot; badge
                  </li>
                </ul>
                <p className="text-slate-500 text-xs mb-3 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-500/80" />
                  Includes Conscious Fund donation
                </p>
                <p className="text-slate-500 text-xs mb-4">Best for: Local businesses, individual supporters</p>
                <button
                  onClick={() => openModal('market', 'Market Sponsor')}
                  className="block w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors"
                >
                  Sponsor Now
                </button>
              </div>

              <div className="bg-slate-900/50 border-2 border-emerald-500/40 rounded-xl p-6 flex flex-col relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  Most Popular
                </span>
                <h3 className="text-lg font-bold text-white mb-1">Category Sponsor</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-2">$10,000 MXN (~$500 USD)</p>
                <ul className="text-slate-300 text-sm space-y-2 mb-4 flex-1">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Logo on ALL markets in a category
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Featured placement on markets list
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Sponsor analytics dashboard
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Social media shoutout
                  </li>
                </ul>
                <p className="text-slate-500 text-xs mb-3 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-500/80" />
                  Includes Conscious Fund donation
                </p>
                <p className="text-slate-500 text-xs mb-4">Best for: Medium businesses, regional brands</p>
                <button
                  onClick={() => openModal('category', 'Category Sponsor')}
                  className="block w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors"
                >
                  Sponsor Now
                </button>
              </div>

              <div className="bg-slate-900/50 border-2 border-amber-500/30 rounded-xl p-6 flex flex-col shadow-lg shadow-amber-500/5">
                <h3 className="text-lg font-bold text-white mb-1">Impact Partner</h3>
                <p className="text-2xl font-bold text-amber-400 mb-2">$50,000 MXN (~$2,500 USD)</p>
                <ul className="text-slate-300 text-sm space-y-2 mb-4 flex-1">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    All Category Sponsor benefits
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Custom branded market(s)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Featured on landing page
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Conscious Fund naming rights
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Quarterly impact report
                  </li>
                </ul>
                <p className="text-slate-500 text-xs mb-3 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-500/80" />
                  Includes Conscious Fund donation
                </p>
                <p className="text-slate-500 text-xs mb-4">Best for: Corporations, ESG-focused brands</p>
                <button
                  onClick={() => openModal('impact', 'Impact Partner')}
                  className="block w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-center text-sm font-medium transition-colors"
                >
                  Sponsor Now
                </button>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-1">Founding Patron</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-2">Custom pricing</p>
                <ul className="text-slate-300 text-sm space-y-2 mb-4 flex-1">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    All Impact Partner benefits
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Co-create market strategy for events
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    VIP access to platform analytics
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Speaking slot at Crowd Conscious events
                  </li>
                </ul>
                <p className="text-slate-500 text-xs mb-3 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-500/80" />
                  Includes Conscious Fund donation
                </p>
                <p className="text-slate-500 text-xs mb-4">Best for: Major sponsors, media partners</p>
                <button
                  onClick={() => openModal('patron', 'Founding Patron')}
                  className="block w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors"
                >
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Available Markets */}
        <section id="markets" className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">Available Markets to Sponsor</h2>
            <p className="text-slate-400 mb-8">
              Active markets without a sponsor. Choose one and sponsor with Stripe checkout.
            </p>

            {unsponsored.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                <p className="text-slate-400">
                  All markets are currently sponsored. Contact us to propose a custom market.
                </p>
                <a href={sponsorMailto()} className="inline-flex items-center gap-2 mt-4 text-emerald-400 hover:text-emerald-300 font-medium">
                  Contact Us
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unsponsored.map((m) => {
                  const config = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.world
                  const Icon = config.icon
                  const leading = leadingOutcomes[m.id]
                  const prob = leading
                    ? Math.round(toDisplayPercent(leading.probability))
                    : Math.round(toDisplayPercent(Number(m.current_probability))) || 50
                  const label = leading?.label ?? 'YES'
                  const votes = m.total_votes ?? 0

                  return (
                    <div
                      key={m.id}
                      className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium w-fit ${config.bg} ${config.text}`}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <h3 className="font-semibold text-white mt-3 line-clamp-2">{m.title}</h3>
                      <p className="text-emerald-400 text-sm mt-2">
                        {label} {prob}%
                      </p>
                      <p className="text-slate-500 text-xs mt-1">{votes} predictions</p>
                      <button
                        onClick={() =>
                          openModal('market', 'Market Sponsor', {
                            marketId: m.id,
                            marketTitle: m.title,
                            category: m.category,
                          })
                        }
                        className="mt-4 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors"
                      >
                        Sponsor this market →
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Current Sponsors */}
        <section className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">Current Sponsors</h2>

            {sponsored.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                <p className="text-slate-400">
                  Be the first brand to sponsor a market on Crowd Conscious. Early sponsors get
                  founding partner recognition.
                </p>
                <button
                  onClick={() => openModal('market', 'Market Sponsor')}
                  className="inline-flex items-center gap-2 mt-4 text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Sponsor Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sponsored.map((m) => (
                  <div
                    key={m.id}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex items-center gap-4"
                  >
                    {m.sponsor_logo_url ? (
                      <img
                        src={m.sponsor_logo_url}
                        alt={m.sponsor_name || ''}
                        className="w-16 h-16 object-contain rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-700 rounded flex items-center justify-center text-2xl">
                        {m.sponsor_name?.[0] || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{m.sponsor_name}</p>
                      <p className="text-slate-400 text-sm truncate">{m.title}</p>
                      {m.sponsor_url && (
                        <a
                          href={m.sponsor_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 text-sm hover:underline flex items-center gap-1 mt-1"
                        >
                          Visit <ExternalLink className="w-3 h-3" />
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
        <section className="py-20 px-4 border-t border-slate-800">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How does my brand appear?</h3>
                <p className="text-slate-400 text-sm">
                  Your logo appears on the market card, detail page, share images (OG cards), and
                  leaderboard. Every user who predicts sees your brand.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Where does the Conscious Fund money go?</h3>
                <p className="text-slate-400 text-sm">
                  Community-voted causes: education, clean water, environment, social justice, health.
                  Users vote monthly on which organizations receive grants.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I propose a custom market?</h3>
                <p className="text-slate-400 text-sm">
                  Yes. We&apos;ll create a market aligned with your brand — World Cup, sustainability,
                  policy, or your industry. Contact us to discuss.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">When should I sponsor?</h3>
                <p className="text-slate-400 text-sm">
                  Now. World Cup campaigns start months before June 11, 2026. Early sponsors get
                  premium placement and founding partner recognition.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Is this gambling?</h3>
                <p className="text-slate-400 text-sm">
                  No. Free-to-play, opinion-based predictions. No money exchanged by users. Brands
                  sponsor; users predict; communities benefit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* For Influencers */}
        <section className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Not a business? You can still make an impact.
            </h2>
            <p className="text-slate-400 mb-6">
              Individual supporters can sponsor a single market starting at $500 MXN. Your name (or
              social handle) appears on the market. Perfect for influencers, content creators, and
              anyone who wants to put their reputation behind a prediction.
            </p>
            <a
              href={sponsorMailto(undefined, 'Individual')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 font-medium transition-colors"
            >
              Sponsor as Individual
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Testimonials / Social Proof */}
        <section className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-6">
              Launching with the 2026 FIFA World Cup
            </h2>
            <p className="text-slate-400 mb-8">
              First sponsors get premium placement during the biggest sporting event in Mexico
              City&apos;s history.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <p className="text-3xl font-bold text-emerald-400">5</p>
                <p className="text-slate-400 text-sm mt-1">matches at Estadio Azteca</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <p className="text-3xl font-bold text-emerald-400">100K+</p>
                <p className="text-slate-400 text-sm mt-1">fans at the Zócalo Fan Fest</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <p className="text-3xl font-bold text-emerald-400">48</p>
                <p className="text-slate-400 text-sm mt-1">nations, 1 city, your brand</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-24 px-4 border-t border-slate-800">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to make an impact?
            </h2>
            <p className="text-slate-400 mb-8">
              Let&apos;s discuss how your brand can reach millions during the World Cup.
            </p>
            <div className="flex justify-center">
              <a
                href={sponsorMailto()}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
              >
                <Mail className="w-5 h-5" />
                Email Us
              </a>
            </div>
            <p className="text-slate-500 text-sm mt-6">
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
