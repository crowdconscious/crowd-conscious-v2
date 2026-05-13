import Link from 'next/link'
import { ArrowRight, ChevronRight, Radio } from 'lucide-react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

type Props = {
  locale: CitizenSignalsLocale
}

/**
 * Homepage teaser for Citizen Signals.
 *
 * Server component. Caller is `app/page.tsx`, which is gated by
 * `NEXT_PUBLIC_SIGNALS_ENABLED` so the component vanishes cleanly when
 * the flag is off (matches the LandingNav + /signals page guards).
 *
 * Lives below the active markets block so the homepage still leads with
 * Pulse — Signals is the second discoverable product surface.
 */
export function SignalsTeaser({ locale }: Props) {
  const t = getCitizenSignalsCopy(locale).landing

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:px-8">
      <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#0f1419]/70 to-amber-500/5">
        <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:gap-12 md:p-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Radio className="h-3.5 w-3.5" />
              {t.eyebrow}
            </p>
            <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              {t.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t.subtitle}
            </p>

            <ul className="mt-6 space-y-2.5">
              {t.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm leading-relaxed text-slate-300 sm:text-base"
                >
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signals"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
              >
                {t.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signals/acerca"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#2d3748] bg-[#1a2029] px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-emerald-500/40"
              >
                {t.ctaSecondary}
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-500">{t.pilotNote}</p>
          </div>

          <div className="hidden flex-col gap-3 md:flex">
            {/* Stylised signal cards — purely decorative, mirrors the
                feed look so visitors recognise the surface later. */}
            <div className="rounded-xl border border-[#2d3748] bg-[#0f1419]/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                {locale === 'es' ? 'Etapa 1 · 67 co-firmas' : 'Stage 1 · 67 co-signs'}
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {locale === 'es'
                  ? 'Banquetas rotas en Av. Álvaro Obregón'
                  : 'Broken sidewalks on Av. Álvaro Obregón'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === 'es'
                  ? 'Alcaldía Cuauhtémoc · Movilidad'
                  : 'Cuauhtémoc · Mobility'}
              </p>
            </div>
            <div className="rounded-xl border border-[#2d3748] bg-[#0f1419]/80 p-4 opacity-90">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                {locale === 'es' ? 'Etapa 2 · 213 co-firmas' : 'Stage 2 · 213 co-signs'}
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {locale === 'es'
                  ? 'Tianguis sin baños en Parque México'
                  : 'Open-air market without bathrooms at Parque México'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === 'es'
                  ? 'SOBSE · Espacio público'
                  : 'SOBSE · Public space'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
