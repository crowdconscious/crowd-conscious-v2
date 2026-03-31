import Link from 'next/link'
import { getMarketText } from '@/lib/i18n/market-translations'

export type LandingActivePulseMarket = {
  id: string
  title: string
  translations: unknown
  total_votes: number | null
}

type Props = {
  locale: 'es' | 'en'
  activePulseMarket: LandingActivePulseMarket | null
  avgConfidence: number | null
}

export function LandingPulseSection({ locale, activePulseMarket, avgConfidence }: Props) {
  const es = locale === 'es'
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
    <section id="pulse" className="scroll-mt-24 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-amber-400">
            📊 Conscious Pulse
          </span>
          <h2 className="mt-2 text-3xl font-bold text-white">
            {es ? 'Mide lo que tu comunidad realmente piensa' : 'Measure what your community really thinks'}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-400">
            {es
              ? 'No es una encuesta. Es inteligencia colectiva con nivel de certeza. Cada voto incluye qué tan seguro está el votante.'
              : "It's not a survey. It's collective intelligence with certainty levels. Every vote includes how confident the voter is."}
          </p>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <span className="text-2xl">🎯</span>
            <h3 className="mt-3 mb-2 font-bold text-white">
              {es ? 'Certeza, no solo votos' : 'Certainty, not just votes'}
            </h3>
            <p className="text-sm text-gray-400">
              {es
                ? '62% dice "sí" con certeza 4/10 vs 38% dice "no" con certeza 9/10 — eso cambia la decisión. Ninguna encuesta te da esto.'
                : '62% say "yes" at certainty 4/10 vs 38% say "no" at certainty 9/10 — that changes the decision. No survey gives you this.'}
            </p>
          </div>
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <span className="text-2xl">⚡</span>
            <h3 className="mt-3 mb-2 font-bold text-white">
              {es ? 'Resultados en minutos' : 'Results in minutes'}
            </h3>
            <p className="text-sm text-gray-400">
              {es
                ? 'Comparte un link, tu audiencia vota desde el celular en 30 segundos. Resultados en tiempo real, no en semanas.'
                : 'Share a link, your audience votes from their phone in 30 seconds. Real-time results, not in weeks.'}
            </p>
          </div>
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <span className="text-2xl">🌱</span>
            <h3 className="mt-3 mb-2 font-bold text-white">
              {es ? 'Impacto social incluido' : 'Social impact included'}
            </h3>
            <p className="text-sm text-gray-400">
              {es
                ? 'Hasta el 40% financia causas comunitarias. Tu investigación genera impacto real y transparente.'
                : 'Up to 40% funds community causes. Your research generates real, transparent impact.'}
            </p>
          </div>
        </div>

        {activePulseMarket && (
          <div className="mb-8 rounded-xl border border-emerald-500/20 bg-[#1a2029] p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-400">
                {es ? 'Pulse activo ahora' : 'Live Pulse now'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">{displayTitle}</h3>
            <p className="mt-1 text-sm text-gray-400">
              {votes} {es ? 'opiniones' : 'opinions'}
              {' · '}
              {es ? 'Confianza promedio' : 'Avg confidence'}: {avg}/10
            </p>
            <Link
              href={`/pulse/${activePulseMarket.id}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-400 hover:underline"
            >
              {es ? 'Ver resultados en vivo →' : 'View live results →'}
            </Link>
          </div>
        )}

        <div className="mb-8 flex flex-wrap justify-center gap-4">
          {[
            { emoji: '🏛️', label: es ? 'Municipios' : 'Municipalities' },
            { emoji: '🏢', label: es ? 'Marcas' : 'Brands' },
            { emoji: '📱', label: es ? 'Influencers' : 'Influencers' },
            { emoji: '📰', label: es ? 'Medios' : 'Media' },
          ].map((item, i) => (
            <span
              key={i}
              className="rounded-full border border-[#2d3748] bg-[#0f1419] px-4 py-2 text-sm text-gray-300"
            >
              {item.emoji} {item.label}
            </span>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/pulse"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            {es ? 'Explorar Conscious Pulse' : 'Explore Conscious Pulse'}
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            {es
              ? 'Desde $5,000 MXN · Primera consulta gratuita para nuevos clientes'
              : 'From $5,000 MXN · First consultation free for new clients'}
          </p>
        </div>
      </div>
    </section>
  )
}
