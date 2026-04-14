import Link from 'next/link'
import { Building2, Trophy } from 'lucide-react'

export function SponsorCTA({ locale }: { locale: 'es' | 'en' }) {
  const isEs = locale === 'es'

  return (
    <section className="bg-gray-900/50 px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-4 flex justify-center">
          <Building2 className="h-8 w-8 text-emerald-500/80" aria-hidden />
        </div>
        <h2 className="mb-4 text-2xl font-bold text-white">
          {isEs ? 'Para Marcas' : 'For Brands'}
        </h2>
        <p className="mb-8 text-base leading-relaxed text-gray-300">
          {isEs ? (
            <>
              Activa tu audiencia con predicciones patrocinadas que financian causas reales. Hasta el 40%
              al Fondo Consciente — hasta 10× el promedio de causa marketing.
            </>
          ) : (
            <>
              Activate your audience with sponsored predictions that fund real causes. Up to 40% to the
              Conscious Fund — up to 10× the cause marketing average.
            </>
          )}
        </p>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-left sm:text-center">
          <p className="flex flex-col items-start gap-2 text-gray-200 sm:items-center sm:text-center">
            <span className="inline-flex items-center gap-2">
              <Trophy className="h-5 w-5 shrink-0 text-amber-400/90" aria-hidden />
              {isEs ? 'Mundial 2026 en Ciudad de México.' : 'World Cup 2026 in Mexico City.'}
            </span>
            <span>
              {isEs ? 'Tu marca. Tu causa. Tu audiencia.' : 'Your brand. Your cause. Your audience.'}
            </span>
          </p>
          <Link
            href="/pulse"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            {isEs ? 'Ver planes de patrocinio →' : 'View sponsorship plans →'}
          </Link>
        </div>

        <div className="mt-12 text-center">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-emerald-400">
            {isEs ? '¿Necesitas medir opinión pública?' : 'Need to measure public opinion?'}
          </h3>
          <p className="mb-2 text-xl font-bold text-white">Conscious Pulse</p>
          <p className="mx-auto mb-4 max-w-xl text-sm text-gray-400">
            {isEs
              ? 'Herramienta de medición de sentimiento para municipios, marcas e influencers. Resultados en tiempo real con analíticas de confianza.'
              : 'Sentiment measurement tool for municipalities, brands, and influencers. Real-time results with confidence analytics.'}
          </p>
          <Link
            href="/pulse"
            className="inline-flex items-center gap-2 font-medium text-emerald-400 transition-colors hover:underline"
          >
            {isEs ? 'Conocer Conscious Pulse →' : 'Learn about Conscious Pulse →'}
          </Link>
        </div>
      </div>
    </section>
  )
}
