'use client'

type Props = {
  locale: 'es' | 'en'
}

/**
 * Top-of-page hero on /para-marcas. Anchors the page to the evergreen
 * value proposition — confidence-weighted community intelligence — and
 * routes prospects to the pricing block where the Founding Pack lives.
 */
export function MundialPulseHero({ locale }: Props) {
  const es = locale === 'es'

  const onClick = () => {
    document
      .getElementById('pulse-mundial-pack')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="border-b border-white/10 bg-gradient-to-br from-emerald-900/20 via-[#0f1419] to-amber-900/10 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          {es ? 'Conscious Pulse · Para marcas' : 'Conscious Pulse · For brands'}
        </span>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {es
            ? 'Mide lo que tu comunidad realmente piensa.'
            : 'Measure what your community actually thinks.'}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
          {es
            ? 'Mide el sentimiento real con Conscious Pulse. Sin bots. Sin encuestas aburridas. Confianza real.'
            : 'Measure real sentiment with Conscious Pulse. No bots. No boring surveys. Real confidence.'}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClick}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {es ? 'Ver el Paquete Fundador' : 'See the Founding Pack'}
          </button>
          <a
            href="#pulse-pricing"
            className="rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            {es ? 'Ver todos los planes' : 'See all plans'}
          </a>
        </div>
      </div>
    </section>
  )
}
