import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import Link from 'next/link'
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

const LandingNav = dynamic(() => import('@/app/components/landing/LandingNav'))
const Footer = dynamic(() => import('@/components/Footer'))

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

const SPONSOR_EMAIL = 'francisco@crowdconscious.app'
const SPONSOR_WHATSAPP = '525544490458'

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

function sponsorWhatsApp(marketTitle?: string) {
  const text = encodeURIComponent(
    `Hola, me interesa patrocinar un mercado en Crowd Conscious: ${marketTitle || '(not specified)'}`
  )
  return `https://wa.me/${SPONSOR_WHATSAPP}?text=${text}`
}

async function getMarkets() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prediction_markets')
    .select('id, title, category, current_probability, total_votes, sponsor_name, sponsor_logo_url, sponsor_url')
    .in('status', ['active', 'trading'])
    .order('total_votes', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Sponsor page markets fetch error:', error)
    return { unsponsored: [], sponsored: [] }
  }

  const unsponsored = (data || []).filter((m) => !m.sponsor_name)
  const sponsored = (data || []).filter((m) => m.sponsor_name)

  return { unsponsored, sponsored }
}

async function getLeadingOutcomes(marketIds: string[]) {
  if (marketIds.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase
    .from('market_outcomes')
    .select('market_id, label, probability')
    .in('market_id', marketIds)
    .order('probability', { ascending: false })

  const byMarket: Record<string, { label: string; probability: number }> = {}
  for (const row of data ?? []) {
    if (!byMarket[row.market_id]) {
      byMarket[row.market_id] = { label: row.label, probability: Number(row.probability) }
    }
  }
  return byMarket
}

export default async function SponsorPage() {
  const { unsponsored, sponsored } = await getMarkets()
  const marketIds = [...unsponsored, ...sponsored].map((m) => m.id)
  const leadingOutcomes = await getLeadingOutcomes(marketIds)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNav />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Put your brand behind what matters
            </h1>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Sponsor prediction markets on Crowd Conscious. Your brand gets visibility with an
              engaged, socially-conscious audience. A portion of every sponsorship funds community
              impact through the Conscious Fund.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                  15% of your sponsorship goes directly to the Conscious Fund. Users vote on which
                  community causes receive grants. Your brand gets credited for the impact.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sponsorship Tiers */}
        <section className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-12">
              Sponsorship Tiers
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-1">Market Sponsor</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-4">$2,000 MXN (~$100 USD)</p>
                <ul className="text-slate-400 text-sm space-y-2 mb-6">
                  <li>• Logo on one market card + detail page</li>
                  <li>• Link to your website/social</li>
                  <li>• Mentioned in market resolution post</li>
                  <li>• &quot;Sponsored by [Brand]&quot; badge</li>
                </ul>
                <p className="text-slate-500 text-xs mb-4">Best for: Local businesses, individual supporters</p>
                <a href={sponsorMailto(undefined, 'Market Sponsor')} className="block w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors">
                  Get Started
                </a>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-1">Category Sponsor</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-4">$10,000 MXN (~$500 USD)</p>
                <ul className="text-slate-400 text-sm space-y-2 mb-6">
                  <li>• Logo on ALL markets in a category</li>
                  <li>• Featured placement on markets list</li>
                  <li>• Sponsor analytics dashboard</li>
                  <li>• Social media shoutout</li>
                </ul>
                <p className="text-slate-500 text-xs mb-4">Best for: Medium businesses, regional brands</p>
                <a href={sponsorMailto(undefined, 'Category Sponsor')} className="block w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors">
                  Get Started
                </a>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-1">Impact Partner</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-4">$50,000 MXN (~$2,500 USD)</p>
                <ul className="text-slate-400 text-sm space-y-2 mb-6">
                  <li>• All Category Sponsor benefits</li>
                  <li>• Custom branded market(s)</li>
                  <li>• Featured on landing page</li>
                  <li>• Conscious Fund naming rights</li>
                  <li>• Quarterly impact report</li>
                </ul>
                <p className="text-slate-500 text-xs mb-4">Best for: Corporations, ESG-focused brands</p>
                <a href={sponsorMailto(undefined, 'Impact Partner')} className="block w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors">
                  Get Started
                </a>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-1">Founding Patron</h3>
                <p className="text-2xl font-bold text-emerald-400 mb-4">Custom pricing</p>
                <ul className="text-slate-400 text-sm space-y-2 mb-6">
                  <li>• All Impact Partner benefits</li>
                  <li>• Co-create market strategy for events</li>
                  <li>• VIP access to platform analytics</li>
                  <li>• Speaking slot at Crowd Conscious events</li>
                </ul>
                <p className="text-slate-500 text-xs mb-4">Best for: Major sponsors, media partners</p>
                <a href={sponsorMailto(undefined, 'Founding Patron')} className="block w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors">
                  Get Started
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Available Markets */}
        <section id="markets" className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">Available Markets to Sponsor</h2>
            <p className="text-slate-400 mb-8">
              Active markets without a sponsor. Choose one and let us know.
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
                    ? Math.round(leading.probability * 100)
                    : Number(m.current_probability) || 50
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
                      <div className="mt-4 flex gap-2">
                        <a
                          href={sponsorMailto(m.title, undefined)}
                          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-center text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          Email Us
                        </a>
                        <a
                          href={sponsorWhatsApp(m.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-center text-sm font-medium transition-colors"
                        >
                          WhatsApp
                        </a>
                      </div>
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
                <a href={sponsorMailto()} className="inline-flex items-center gap-2 mt-4 text-emerald-400 hover:text-emerald-300 font-medium">
                  Contact Us
                  <ExternalLink className="w-4 h-4" />
                </a>
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
            <div className="flex flex-wrap gap-4">
              <a
                href={sponsorMailto(undefined, 'Individual')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 font-medium transition-colors"
              >
                Sponsor as Individual
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
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
      </main>

      <Footer />
    </div>
  )
}
