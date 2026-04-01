import Link from 'next/link'

const eventTypes = [
  {
    icon: '⚽',
    title: { es: 'Partidos de fútbol', en: 'Soccer matches' },
    desc: {
      es: 'Micro-predicciones durante cada partido. ¿Quién anota? ¿Gol antes del minuto 30? La audiencia predice en vivo.',
      en: 'Micro-predictions during each match. Who scores? Goal before minute 30? The audience predicts live.',
    },
  },
  {
    icon: '🏷️',
    title: { es: 'Lanzamientos de marca', en: 'Brand launches' },
    desc: {
      es: 'Tu audiencia vota durante tu livestream. ¿Qué producto prefieren? ¿Cumplió expectativas? Datos en tiempo real.',
      en: 'Your audience votes during your livestream. Which product do they prefer? Did it meet expectations? Real-time data.',
    },
  },
  {
    icon: '🏛️',
    title: { es: 'Conferencias y debates', en: 'Conferences & debates' },
    desc: {
      es: 'Consulta ciudadana en vivo. Proyecta resultados en pantalla. La audiencia opina mientras mira.',
      en: 'Live citizen consultation. Project results on screen. The audience votes while watching.',
    },
  },
  {
    icon: '🎬',
    title: { es: 'Entretenimiento', en: 'Entertainment' },
    desc: {
      es: 'Estrenos, premios, conciertos. ¿Quién gana? ¿Cuál será la escena más comentada? La comunidad predice.',
      en: 'Premieres, awards, concerts. Who wins? What will be the most talked-about scene? The community predicts.',
    },
  },
] as const

type Props = {
  locale: 'es' | 'en'
  daysUntilWc: number
}

export function LiveProductSections({ locale, daysUntilWc }: Props) {
  const es = locale === 'es'
  const L = (o: { es: string; en: string }) => (es ? o.es : o.en)

  return (
    <>
      <section className="px-4 pb-12 pt-8 sm:pt-10">
        <div className="mx-auto max-w-4xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
            {es ? '🔴 CONSCIOUS LIVE' : '🔴 CONSCIOUS LIVE'}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {es
              ? 'Predicciones en tiempo real durante eventos en vivo'
              : 'Real-time predictions during live events'}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            {es
              ? 'Transmisión en vivo + micro-predicciones + leaderboard + chat. La experiencia de segunda pantalla definitiva.'
              : 'Live stream + micro-predictions + leaderboard + chat. The ultimate second-screen experience.'}
          </p>
          <p className="mt-5 text-sm text-emerald-400/95">
            {es ? (
              <>
                ⚽ Próximo: Copa del Mundo 2026 — 11 de junio, Estadio Azteca
                {daysUntilWc > 0 ? ` · Faltan ${daysUntilWc} días` : ''}
              </>
            ) : (
              <>
                ⚽ Next: 2026 World Cup — June 11, Estadio Azteca
                {daysUntilWc > 0 ? ` · ${daysUntilWc} days to go` : ''}
              </>
            )}
          </p>
        </div>
      </section>

      <section className="px-4 pb-14">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2">
          {eventTypes.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5 transition hover:border-teal-500/25"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-2 text-base font-bold text-white">{L(f.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{L(f.desc)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

type B2BProps = {
  locale: 'es' | 'en'
}

export function LiveB2BCTA({ locale }: B2BProps) {
  const es = locale === 'es'
  return (
    <section className="border-t border-[#2d3748] px-4 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-xl font-bold text-white">
          {es ? '¿Quieres un evento en vivo con tu marca?' : 'Want a live event with your brand?'}
        </h2>
        <p className="mt-3 text-slate-400">
          {es
            ? 'Lanzamientos, conferencias, activaciones — totalmente personalizable.'
            : 'Launches, conferences, activations — fully customizable.'}
        </p>
        <Link
          href="/sponsor"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          {es ? 'Conocer planes →' : 'View plans →'}
        </Link>
      </div>
    </section>
  )
}
