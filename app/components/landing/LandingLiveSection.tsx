import Link from 'next/link'

type Props = {
  locale: 'es' | 'en'
}

export function LandingLiveSection({ locale }: Props) {
  const es = locale === 'es'

  const features = [
    {
      icon: '⚽',
      title: es ? 'Partidos del Mundial' : 'World Cup matches',
      desc: es
        ? 'Micro-mercados durante cada partido. ¿Quién anota? ¿Gol antes del minuto 30? La audiencia predice en vivo.'
        : 'Micro-markets during each match. Who scores? Goal before minute 30? The audience predicts live.',
    },
    {
      icon: '🏷️',
      title: es ? 'Lanzamientos de marca' : 'Brand launches',
      desc: es
        ? 'Tu audiencia vota durante tu livestream. ¿Qué producto prefieren? ¿Cumplió expectativas? Datos en tiempo real.'
        : 'Your audience votes during your livestream. Which product do they prefer? Did it meet expectations? Real-time data.',
    },
    {
      icon: '🏛️',
      title: es ? 'Conferencias y debates' : 'Conferences & debates',
      desc: es
        ? 'Consulta ciudadana en vivo. Proyecta resultados en pantalla. La audiencia opina mientras mira.'
        : 'Live citizen consultation. Project results on screen. The audience votes while watching.',
    },
    {
      icon: '🎬',
      title: es ? 'Entretenimiento' : 'Entertainment',
      desc: es
        ? 'Estrenos, premios, conciertos. ¿Quién gana? ¿Cuál será la escena más comentada? La comunidad predice.'
        : 'Premieres, awards, concerts. Who wins? What will be the most talked-about scene? The community predicts.',
    },
  ]

  return (
    <section className="border-t border-[#2d3748] px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-red-400">🔴 Conscious Live</span>
          <h2 className="mt-2 text-3xl font-bold text-white">
            {es ? 'Predicciones en tiempo real durante eventos en vivo' : 'Real-time predictions during live events'}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-400">
            {es
              ? 'Transmisión en vivo + micro-predicciones + leaderboard + chat. La experiencia de segunda pantalla definitiva.'
              : 'Live stream + micro-predictions + leaderboard + chat. The ultimate second-screen experience.'}
          </p>
        </div>

        <div className="mb-10 grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="mt-1 text-xl">{f.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <div className="text-center">
              <div className="mb-4 text-4xl">🏟️</div>
              <h3 className="text-lg font-bold text-white">
                {es ? 'México 🇲🇽 vs 🇵🇹 Portugal' : 'México 🇲🇽 vs 🇵🇹 Portugal'}
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                {es
                  ? 'Nuestro primer evento en vivo — predicciones en tiempo real durante el partido.'
                  : 'Our first live event — real-time predictions during the match.'}
              </p>
              <span className="mt-3 inline-block rounded-full bg-[#0f1419] px-3 py-1 text-xs text-gray-500">
                Completed · Mar 28, 2026
              </span>
            </div>
            <p className="mt-4 text-center text-xs text-gray-600">
              [ Add mobile screenshot of live event ]
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/live"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 px-6 py-3 font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/10"
          >
            {es ? 'Ver eventos en vivo →' : 'View live events →'}
          </Link>
        </div>
      </div>
    </section>
  )
}
