'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { toDisplayPercent } from '@/lib/probability-utils'
import {
  Target,
  Vote,
  Heart,
  Globe,
  Building2,
  Briefcase,
  Users,
  Trophy,
  Leaf,
  ChevronRight,
} from 'lucide-react'

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

type HeroMarket = {
  id: string
  title: string
  category: string
  current_probability: number
  total_votes: number | null
}

type OutcomeByMarket = Record<string, { label: string; probability: number }>

const CONTENT = {
  es: {
    heroTitle: 'Predice lo que importa.',
    heroSubtitle: 'Financia el cambio real.',
    heroDesc: 'Predicciones gratuitas sobre el Mundial, tu ciudad y lo que te importa. Sin dinero — las marcas patrocinan el impacto.',
    startPredicting: 'Empezar a Predecir',
    browseMarkets: 'Ver Mercados',
    howItWorks: 'Cómo funciona',
    pickMarket: 'Elige un mercado',
    pickMarketDesc: 'Mundial, sostenibilidad, política, cultura — elige lo que te importa.',
    sharePrediction: 'Comparte tu predicción',
    sharePredictionDesc: 'Vota con confianza. Gana XP. Sube en el ranking.',
    fundChange: 'Financia el cambio',
    fundChangeDesc: 'Las marcas patrocinan. Tú votas a qué causas van los fondos.',
    predictions: 'predicciones',
  },
  en: {
    heroTitle: 'Predict what matters.',
    heroSubtitle: 'Fund real change.',
    heroDesc: 'Free predictions on the World Cup, your city, and the issues you care about. No money needed — brands sponsor the impact.',
    startPredicting: 'Start Predicting',
    browseMarkets: 'Browse Markets',
    howItWorks: 'How it works',
    pickMarket: 'Pick a market',
    pickMarketDesc: 'World Cup, sustainability, policy, culture — choose what matters to you.',
    sharePrediction: 'Share your prediction',
    sharePredictionDesc: 'Vote with confidence. Earn XP. Climb the leaderboard.',
    fundChange: 'Fund the change',
    fundChangeDesc: 'Brands sponsor. You vote where the money goes.',
    predictions: 'predictions',
  },
}

export function LandingHeroClient({
  heroMarkets,
  outcomesByMarket,
}: {
  heroMarkets: HeroMarket[]
  outcomesByMarket: OutcomeByMarket
}) {
  const { language } = useLanguage()
  const c = CONTENT[language]

  return (
    <>
      {/* Hero */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
            {c.heroTitle}
            <br />
            <span className="text-emerald-400">{c.heroSubtitle}</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">{c.heroDesc}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg transition-colors"
            >
              {c.startPredicting}
            </Link>
            <Link
              href="/markets"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-200 font-semibold transition-colors"
            >
              {c.browseMarkets}
            </Link>
          </div>

          {heroMarkets.length > 0 && (
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {heroMarkets.map((m) => {
              const config = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.world
              const Icon = config.icon
              const leading = outcomesByMarket[m.id]
              const prob = leading
                ? Math.round(toDisplayPercent(leading.probability))
                : Math.round(toDisplayPercent(Number(m.current_probability))) || 50
              const label = leading?.label ?? 'YES'
              const votes = m.total_votes ?? 0

              return (
                <Link
                  key={m.id}
                  href={`/predictions/markets/${m.id}`}
                  className="block bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors text-left"
                >
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
                  >
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </span>
                  <p className="font-medium text-white mt-2 line-clamp-2">{m.title}</p>
                  <p className="text-emerald-400 text-sm font-semibold mt-1">
                    {label} {prob}%
                  </p>
                  <p className="text-slate-500 text-xs mt-1">{votes} {c.predictions}</p>
                </Link>
              )
            })}
          </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">{c.howItWorks}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{c.pickMarket}</h3>
              <p className="text-slate-400">{c.pickMarketDesc}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Vote className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{c.sharePrediction}</h3>
              <p className="text-slate-400">{c.sharePredictionDesc}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{c.fundChange}</h3>
              <p className="text-slate-400">{c.fundChangeDesc}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
