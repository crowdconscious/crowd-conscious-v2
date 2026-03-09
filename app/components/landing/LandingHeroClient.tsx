'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toDisplayPercent } from '@/lib/probability-utils'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'
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
  { label: string; icon: React.ElementType; bg: string; text: string; emoji: string }
> = {
  world: { label: 'World', icon: Globe, bg: 'bg-blue-500/20', text: 'text-blue-400', emoji: '🌍' },
  government: { label: 'Government', icon: Building2, bg: 'bg-red-500/20', text: 'text-red-400', emoji: '🏛' },
  corporate: { label: 'Corporate', icon: Briefcase, bg: 'bg-purple-500/20', text: 'text-purple-400', emoji: '🏢' },
  community: { label: 'Community', icon: Users, bg: 'bg-emerald-500/20', text: 'text-emerald-400', emoji: '👥' },
  cause: { label: 'Cause', icon: Heart, bg: 'bg-amber-500/20', text: 'text-amber-400', emoji: '💚' },
  world_cup: { label: 'World Cup', icon: Trophy, bg: 'bg-emerald-500/20', text: 'text-emerald-400', emoji: '⚽' },
  sustainability: { label: 'Sustainability', icon: Leaf, bg: 'bg-green-500/20', text: 'text-green-400', emoji: '🌱' },
}

const WORLD_CUP_DATE = new Date('2026-06-11T12:00:00Z')

function getDaysUntilWorldCup(): number {
  const now = new Date()
  const diff = WORLD_CUP_DATE.getTime() - now.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function useCountUp(end: number, duration: number, isVisible: boolean): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!isVisible || end === 0) return
    let start = 0
    const step = end / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [end, duration, isVisible])
  return count
}

function StatCounter({
  value,
  suffix,
  label,
  isVisible,
  formatAsCurrency,
}: {
  value: number
  suffix: string
  label: string
  isVisible: boolean
  formatAsCurrency?: boolean
}) {
  const display = useCountUp(value, 1500, isVisible)
  const formatted = formatAsCurrency
    ? display === 0
      ? '$0'
      : value >= 1_000_000
        ? `$${(display / 1_000_000).toFixed(1)}M`
        : value >= 1_000
          ? `$${(display / 1_000).toFixed(1)}K`
          : `$${display}`
    : `${display.toLocaleString()}${suffix}`
  return (
    <div className="text-center">
      <p className="text-2xl md:text-3xl font-bold text-emerald-400">{formatted}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
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
    worldCupBanner: 'FIFA World Cup 2026 empieza en',
    days: 'días',
    predictionsLabel: 'Predicciones',
    fundImpact: 'Impacto del Fondo',
    marketsLabel: 'Mercados',
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
    worldCupBanner: 'FIFA World Cup 2026 kicks off in',
    days: 'days',
    predictionsLabel: 'Predictions',
    fundImpact: 'Fund Impact',
    marketsLabel: 'Markets',
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
  const [daysToWorldCup, setDaysToWorldCup] = useState(0)
  const [stats, setStats] = useState({ totalPredictions: 0, fundAmount: 0, totalMarkets: 0 })
  const [statsVisible, setStatsVisible] = useState(false)
  const [cardsVisible, setCardsVisible] = useState<boolean[]>([])
  const statsRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setDaysToWorldCup(getDaysUntilWorldCup())
  }, [])

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setStatsVisible(true)
      },
      { threshold: 0.2 }
    )
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const i = cardRefs.current.indexOf(e.target as HTMLDivElement)
          if (i >= 0 && e.isIntersecting) {
            setCardsVisible((prev) => {
              const next = [...prev]
              next[i] = true
              return next
            })
          }
        })
      },
      { threshold: 0.1 }
    )
    cardRefs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <>
      {/* Hero */}
      <section
        className="relative pt-24 pb-20 px-4 overflow-hidden"
        style={{
          backgroundImage: 'url(/images/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Animated floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl"
            style={{ animation: 'float-orb-1 15s ease-in-out infinite' }}
          />
          <div
            className="absolute top-1/3 right-1/5 w-48 h-48 rounded-full bg-teal-500/12 blur-3xl"
            style={{ animation: 'float-orb-2 12s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-1/4 left-1/3 w-56 h-56 rounded-full bg-emerald-600/10 blur-3xl"
            style={{ animation: 'float-orb-3 18s ease-in-out infinite' }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto text-center">
          {/* World Cup countdown */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-6">
            <span>⚽</span>
            <span>{c.worldCupBanner} {daysToWorldCup} {c.days}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
            {c.heroTitle}
            <br />
            <span className="text-emerald-400">{c.heroSubtitle}</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">{c.heroDesc}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg transition-all hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] cta-pulse-hover"
              style={{
                animation: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.animation = 'cta-pulse-glow 1.5s ease-in-out infinite'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.animation = 'none'
              }}
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

          {/* Stats counters */}
          <div
            ref={statsRef}
            className="mt-12 flex flex-wrap justify-center gap-8 md:gap-16"
          >
            <StatCounter
              value={stats.totalPredictions}
              suffix="+"
              label={c.predictionsLabel}
              isVisible={statsVisible}
            />
            <StatCounter
              value={stats.fundAmount}
              suffix=""
              label={c.fundImpact}
              isVisible={statsVisible}
              formatAsCurrency
            />
            <StatCounter
              value={stats.totalMarkets}
              suffix=""
              label={c.marketsLabel}
              isVisible={statsVisible}
            />
          </div>

          {heroMarkets.length > 0 && (
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {heroMarkets.map((m, i) => {
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
                    className="block bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all duration-300 text-left"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
                    >
                      <span>{config.emoji}</span>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                    <p className="font-medium text-white mt-2 line-clamp-2">{getMarketText(m, 'title', language)}</p>
                    <p className="text-emerald-400 text-lg font-bold mt-1">
                      {leading ? getOutcomeLabel(leading, language) : label} {prob}%
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
            {[
              { icon: Target, title: c.pickMarket, desc: c.pickMarketDesc, img: '/images/step-1.png', alt: 'Pick a market' },
              { icon: Vote, title: c.sharePrediction, desc: c.sharePredictionDesc, img: '/images/step-2.png', alt: 'Share your prediction' },
              { icon: Heart, title: c.fundChange, desc: c.fundChangeDesc, img: '/images/step-3.png', alt: 'Fund the change' },
            ].map((item, i) => (
              <div
                key={i}
                ref={(el) => { cardRefs.current[i] = el }}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 transition-all duration-500 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]"
                style={{
                  opacity: cardsVisible[i] ? 1 : 0,
                  transform: cardsVisible[i] ? 'translateY(0)' : 'translateY(20px)',
                }}
              >
                <div className="w-16 h-16 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <item.icon className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
                <img src={item.img} alt={item.alt} className="w-full rounded-lg mt-4 object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
