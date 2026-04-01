import Link from 'next/link'
import { getMarketText } from '@/lib/i18n/market-translations'
import type { PulseHeroMarket } from '@/lib/pulse/pulse-hero-data'

const copy = {
  badge: { es: '📊 CONSCIOUS PULSE', en: '📊 CONSCIOUS PULSE' },
  h1: {
    es: 'Mide lo que tu comunidad realmente piensa',
    en: 'Measure what your community really thinks',
  },
  subtitle: {
    es: 'No es una encuesta. Es inteligencia colectiva con nivel de certeza. Cada voto incluye qué tan seguro está el votante.',
    en: "It's not a survey. It's collective intelligence with certainty levels. Every vote includes how confident the voter is.",
  },
  certaintyTitle: { es: 'Certeza, no solo votos', en: 'Certainty, not just votes' },
  certaintyDesc: {
    es: '62% dice "sí" con certeza 4/10 vs 38% dice "no" con certeza 9/10 — eso cambia la decisión. Ninguna encuesta te da esto.',
    en: '62% say "yes" at certainty 4/10 vs 38% say "no" at certainty 9/10 — that changes the decision. No survey gives you this.',
  },
  speedTitle: { es: 'Resultados en minutos', en: 'Results in minutes' },
  speedDesc: {
    es: 'Comparte un link, tu audiencia vota desde el celular en 30 segundos. Resultados en tiempo real, no en semanas.',
    en: 'Share a link, your audience votes from their phone in 30 seconds. Real-time results, not in weeks.',
  },
  impactTitle: { es: 'Impacto social incluido', en: 'Social impact included' },
  impactDesc: {
    es: 'Hasta el 40% financia causas comunitarias. Tu investigación genera impacto real y transparente.',
    en: 'Up to 40% funds community causes. Your research generates real, transparent impact.',
  },
  livePulse: { es: '● Pulse activo ahora', en: '● Live Pulse now' },
  viewResults: { es: 'Ver resultados en vivo →', en: 'View live results →' },
  opinions: { es: 'opiniones', en: 'opinions' },
  avgConf: { es: 'Confianza promedio', en: 'Avg confidence' },
  explore: { es: 'Explorar Conscious Pulse', en: 'Explore Conscious Pulse' },
  /** Anchor on /pulse → #pulse-consultations */
  exploreHash: '#pulse-consultations',
  pricing: {
    es: 'Desde $5,000 MXN · Primera consulta gratuita',
    en: 'From $5,000 MXN · First consultation free',
  },
  audience: [
    { emoji: '🏛️', es: 'Municipios', en: 'Municipalities' },
    { emoji: '🏢', es: 'Marcas', en: 'Brands' },
    { emoji: '📱', es: 'Influencers', en: 'Influencers' },
    { emoji: '📰', es: 'Medios', en: 'Media' },
  ],
} as const

type Props = {
  locale: 'es' | 'en'
  activePulseMarket: PulseHeroMarket | null
  avgConfidence: number | null
}

export function PulseProductSections({ locale, activePulseMarket, avgConfidence }: Props) {
  const es = locale === 'es'
  const L = (o: { es: string; en: string }) => (es ? o.es : o.en)

  const displayTitle = activePulseMarket
    ? getMarketText(
        {
          title: activePulseMarket.title,
          translations: activePulseMarket.translations as Parameters<typeof getMarketText>[0]['translations'],
        },
        'title',
        locale
      )
    : ''

  const votes = activePulseMarket?.total_votes ?? 0
  const avg =
    avgConfidence != null && !Number.isNaN(avgConfidence) ? avgConfidence.toFixed(1) : '—'

  return (
    <>
      <section className="px-4 pb-12 pt-8 sm:pt-10">
        <div className="mx-auto max-w-4xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">{L(copy.badge)}</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[2.25rem] leading-tight">
            {L(copy.h1)}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">{L(copy.subtitle)}</p>
        </div>
      </section>

      <section className="px-4 pb-14">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <span className="text-2xl">🎯</span>
            <h3 className="mt-3 mb-2 font-bold text-white">{L(copy.certaintyTitle)}</h3>
            <p className="text-sm text-slate-400">{L(copy.certaintyDesc)}</p>
          </div>
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <span className="text-2xl">⚡</span>
            <h3 className="mt-3 mb-2 font-bold text-white">{L(copy.speedTitle)}</h3>
            <p className="text-sm text-slate-400">{L(copy.speedDesc)}</p>
          </div>
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <span className="text-2xl">🌱</span>
            <h3 className="mt-3 mb-2 font-bold text-white">{L(copy.impactTitle)}</h3>
            <p className="text-sm text-slate-400">{L(copy.impactDesc)}</p>
          </div>
        </div>
      </section>

      {activePulseMarket && (
        <section className="px-4 pb-12">
          <div className="mx-auto max-w-4xl rounded-xl border-2 border-emerald-500/35 bg-[#1a2029] p-6 shadow-lg shadow-emerald-900/10">
            <div className="mb-3 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm font-semibold text-emerald-400">{L(copy.livePulse)}</span>
            </div>
            <h3 className="text-lg font-bold text-white">{displayTitle}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {votes} {L(copy.opinions)} · {L(copy.avgConf)}: {avg}/10
            </p>
            <Link
              href={`/pulse/${activePulseMarket.id}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              {L(copy.viewResults)}
            </Link>
          </div>
        </section>
      )}

      <section className="px-4 pb-10">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3">
          {copy.audience.map((item, i) => (
            <span
              key={i}
              className="rounded-full border border-[#2d3748] bg-[#0f1419] px-4 py-2 text-sm text-slate-300"
            >
              {item.emoji} {es ? item.es : item.en}
            </span>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-4xl text-center">
          <Link
            href={copy.exploreHash}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white transition hover:bg-emerald-600"
          >
            {L(copy.explore)}
          </Link>
          <p className="mt-3 text-sm text-slate-500">{L(copy.pricing)}</p>
        </div>
      </section>
    </>
  )
}
