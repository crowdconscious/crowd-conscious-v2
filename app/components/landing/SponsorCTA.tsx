import Link from 'next/link'
import { Building2 } from 'lucide-react'

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
              Activa tu audiencia con predicciones patrocinadas que financian causas reales. 40% al Fondo
              Consciente — 10× el promedio de causa marketing.
            </>
          ) : (
            <>
              Activate your audience with sponsored predictions that fund real causes. 40% to the Conscious
              Fund — 10× the average for cause marketing.
            </>
          )}
        </p>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-left sm:text-center">
          <p className="text-gray-200">
            {isEs ? (
              <>
                🏆 Mundial 2026 en Ciudad de México.
                <br />
                Tu marca. Tu causa. Tu audiencia.
              </>
            ) : (
              <>
                🏆 World Cup 2026 in Mexico City.
                <br />
                Your brand. Your cause. Your audience.
              </>
            )}
          </p>
          <Link
            href="/sponsor"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            {isEs ? 'Ver planes de patrocinio →' : 'View sponsorship plans →'}
          </Link>
        </div>
      </div>
    </section>
  )
}
