import Link from 'next/link'
import { ArrowRight, Megaphone } from 'lucide-react'

type Props = {
  locale: 'es' | 'en'
}

/**
 * Compact "Para Marcas" below-the-fold block. Replaces the heavier
 * LandingPulseSection + SponsorCTA combo so the homepage stays focused.
 */
export function BrandsMiniPitch({ locale }: Props) {
  const es = locale === 'es'
  return (
    <section className="border-t border-cc-border px-4 py-14 md:px-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-[#2d3748] bg-[#1a2029] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {es ? 'Para marcas' : 'For brands'}
              </p>
              <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                {es
                  ? 'Mide lo que tu comunidad realmente piensa.'
                  : 'Measure what your community actually thinks.'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {es
                  ? 'Encuestas con confianza medida, no likes. Desde $1,500 MXN.'
                  : 'Surveys with measured confidence, not likes. From $1,500 MXN.'}
              </p>
            </div>
          </div>
          <Link
            href="/pulse"
            className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
          >
            {es ? 'Ver Conscious Pulse' : 'See Conscious Pulse'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
