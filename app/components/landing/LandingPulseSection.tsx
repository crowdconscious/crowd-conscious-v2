import Link from 'next/link'

type Props = {
  locale: 'es' | 'en'
}

export function LandingPulseSection({ locale }: Props) {
  const es = locale === 'es'

  return (
    <section id="pulse" className="scroll-mt-24 px-4 py-16 text-center">
      <span className="text-sm font-bold uppercase tracking-wider text-amber-400">📊 Conscious Pulse</span>
      <h2 className="mt-2 text-3xl font-bold text-white">
        {es ? 'Mide lo que tu comunidad realmente piensa' : 'Measure what your community really thinks'}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-gray-400">
        {es
          ? 'No es una encuesta. Es inteligencia colectiva con nivel de certeza. Cada voto incluye qué tan seguro está el votante.'
          : "It's not a survey. It's collective intelligence with certainty levels. Every vote includes how confident the voter is."}
      </p>
      <div className="mt-6">
        <Link
          href="/pulse"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          {es ? 'Explorar Conscious Pulse' : 'Explore Conscious Pulse'}
        </Link>
      </div>
    </section>
  )
}
