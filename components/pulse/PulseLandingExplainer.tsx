import Link from 'next/link'
import { getMarketText } from '@/lib/i18n/market-translations'
import type { PulseHeroMarket } from '@/lib/pulse/pulse-hero-data'

type Locale = 'es' | 'en'

type Props = {
  locale: Locale
  heroMarket: PulseHeroMarket | null
  avgConfidence: number | null
  strongOpinions: number
}

export function PulseLandingExplainer({ locale, heroMarket, avgConfidence, strongOpinions }: Props) {
  const es = locale === 'es'
  const L = (es: string, en: string) => (es ? es : en)

  const title = heroMarket
    ? getMarketText(
        {
          title: heroMarket.title,
          translations: heroMarket.translations as Parameters<typeof getMarketText>[0]['translations'],
        },
        'title',
        locale === 'es' ? 'es' : 'en'
      )
    : ''
  const votes = heroMarket?.total_votes ?? 0
  const avg = avgConfidence != null && !Number.isNaN(avgConfidence) ? avgConfidence.toFixed(1) : '—'

  const useCases = [
    {
      emoji: '🏛️',
      t: L('Municipios', 'Municipalities'),
      d: L(
        'Decisiones públicas con señal clara de tu comunidad, no solo ruido en redes.',
        'Public decisions with a clear signal from your community—not just social noise.'
      ),
    },
    {
      emoji: '🏢',
      t: L('Marcas', 'Brands'),
      d: L(
        'Investigación rápida sobre producto, campaña o posicionamiento con confianza cuantificada.',
        'Fast research on product, campaign, or positioning with quantified confidence.'
      ),
    },
    {
      emoji: '📱',
      t: L('Influencers & medios', 'Influencers & media'),
      d: L(
        'Tu audiencia vota en segundos; ves distribución y certeza en tiempo real.',
        'Your audience votes in seconds; you see distribution and certainty live.',
      ),
    },
  ]

  const dataCards = [
    {
      title: L('Distribución por opción', 'Distribution by option'),
      body: L('No solo “quién ganó”: el desglose completo entre respuestas.', 'Not just who won—the full split across answers.'),
    },
    {
      title: L('Confianza promedio', 'Average confidence'),
      body: L('Cada voto trae un nivel de certeza (1–10).', 'Every vote carries a certainty level (1–10).'),
    },
    {
      title: L('Histograma de confianza', 'Confidence histogram'),
      body: L('Dónde está la masa de tu audiencia en certeza.', 'Where the bulk of your audience sits on certainty.'),
    },
    {
      title: L('Línea de tiempo', 'Timeline'),
      body: L('Cómo evoluciona el sentimiento durante la ventana activa.', 'How sentiment shifts over the active window.'),
    },
    {
      title: L('Anti-spam', 'Anti-spam'),
      body: L('Señales para reducir bots y votos duplicados.', 'Signals to reduce bots and duplicate votes.'),
    },
    {
      title: L('Resumen ejecutivo', 'Executive summary'),
      body: L('Listo para compartir con tu equipo o stakeholders.', 'Ready to share with your team or stakeholders.'),
    },
  ]

  return (
    <>
      {/* What is Conscious Pulse */}
      <section className="border-t border-white/10 bg-[#0f1419] px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {L('¿Qué es Conscious Pulse?', 'What is Conscious Pulse?')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            {L(
              'Medición de sentimiento público en tiempo real: votos con nivel de confianza, resultados en vivo y reportes accionables.',
              'Real-time public sentiment measurement: confidence-weighted votes, live results, and actionable reports.'
            )}
          </p>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="px-4 py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <h3 className="text-lg font-bold text-amber-400/90">{L('El problema', 'The problem')}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>• {L('Encuestas tradicionales cuestan $50K+ y tardan semanas.', 'Traditional surveys cost $50K+ and take weeks.')}</li>
              <li>• {L('Redes sociales son ruido, no una muestra confiable.', 'Social feeds are noise, not a reliable sample.')}</li>
              <li>• {L('Focus groups no escalan ni capturan a toda tu audiencia.', 'Focus groups don’t scale or capture your full audience.')}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-[#1a2029] p-6 lg:col-span-2">
            <h3 className="text-lg font-bold text-emerald-400">{L('La solución', 'The solution')}</h3>
            <p className="mt-3 text-slate-300">
              {L(
                'Votación ponderada por confianza: cada persona indica qué tan segura está de su respuesta. Ves distribución, certeza y razonamiento — no solo porcentajes planos.',
                'Confidence-weighted voting: each person shows how sure they are. You get distribution, certainty, and reasoning—not flat percentages alone.'
              )}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {L(
                'Dashboard en tiempo real, código QR para compartir, y PDF con insights para tu equipo.',
                'Real-time dashboard, QR sharing, and PDF insights for your team.'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-t border-white/10 bg-[#0f1419] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-bold text-white sm:text-2xl">
            {L('Casos de uso', 'Use cases')}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {useCases.map((u) => (
              <div key={u.t} className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
                <span className="text-2xl">{u.emoji}</span>
                <h3 className="mt-3 font-bold text-white">{u.t}</h3>
                <p className="mt-2 text-sm text-slate-400">{u.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data you get */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-bold text-white sm:text-2xl">
            {L('Datos que obtienes', 'Data you get')}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dataCards.map((c) => (
              <div key={c.title} className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5">
                <h3 className="font-semibold text-emerald-400/95">{c.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-white/10 bg-[#0f1419] px-4 py-14">
        <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-500/25 bg-[#1a2029] p-8 text-center">
          <h2 className="text-lg font-bold text-white sm:text-xl">
            {L('Prueba en vivo', 'Live proof')}
          </h2>
          {heroMarket ? (
            <>
              <p className="mt-2 text-sm text-slate-400">{L('Pulse destacado', 'Featured Pulse')}</p>
              <p className="mt-3 text-base font-medium text-white">{title}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{votes}</p>
                  <p className="text-slate-500">{L('votos', 'votes')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{avg}</p>
                  <p className="text-slate-500">{L('confianza prom. /10', 'avg confidence /10')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{strongOpinions}</p>
                  <p className="text-slate-500">{L('opiniones fuertes (8–10)', 'strong opinions (8–10)')}</p>
                </div>
              </div>
              <Link
                href={`/pulse/${heroMarket.id}`}
                className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                {L('Ver resultados →', 'View results →')}
              </Link>
            </>
          ) : (
            <p className="mt-4 text-slate-400">
              {L(
                'Pronto publicamos métricas agregadas de los primeros Pulses.',
                'Aggregated metrics from early Pulses will be published soon.'
              )}
            </p>
          )}
        </div>
      </section>
    </>
  )
}
