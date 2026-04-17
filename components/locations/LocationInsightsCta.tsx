'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

type Props = {
  locationName: string
  locale: 'es' | 'en'
}

/**
 * Conversion CTA on the Location Insights page. Deep-links into the
 * /pulse/pilot checkout with `business` prefilled from the location
 * name so the owner doesn't have to retype it.
 */
export function LocationInsightsCta({ locationName, locale }: Props) {
  const href = `/pulse/pilot?business=${encodeURIComponent(locationName)}&source=location_insights`

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#1a2029] to-[#1a2029] p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          {locale === 'es' ? 'Para dueños' : 'For owners'}
        </p>
      </div>
      <h2 className="text-xl font-bold text-white sm:text-2xl">
        {locale === 'es'
          ? '¿Quieres saber más sobre tu comunidad?'
          : 'Want to dig deeper into your community?'}
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        {locale === 'es'
          ? `La comunidad ya está votando por ${locationName}. Con Pulse puedes hacerles una pregunta específica y obtener respuestas con certeza medida — no solo un "me gusta".`
          : `The community is already voting for ${locationName}. With Pulse you can ask them a specific question and get answers with measured confidence — not just a "like".`}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
      >
        {locale === 'es'
          ? `Activa un Pulse para ${locationName} · $1,500 MXN`
          : `Activate a Pulse for ${locationName} · $1,500 MXN`}
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-3 text-xs text-slate-500">
        {locale === 'es'
          ? 'Tier piloto · 7 días · 1 pregunta · 0% al Fondo (prueba sin compromiso)'
          : 'Pilot tier · 7 days · 1 question · 0% to the Fund (no-commitment trial)'}
      </p>
    </section>
  )
}
