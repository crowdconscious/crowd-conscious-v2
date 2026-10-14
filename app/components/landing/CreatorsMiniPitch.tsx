import Link from 'next/link'
import { ArrowRight, Heart, PenLine, Sparkles } from 'lucide-react'

type Props = {
  locale: 'es' | 'en'
}

/**
 * Homepage "Para creadores" block. Upgraded from a thin banner to a card
 * with bullets + an illustrative article preview, but intentionally lighter
 * than the Organizaciones showcase (smaller headline, single CTA weight).
 * Explicit hex colours keep contrast ≥ 4.5:1 in both themes.
 */
export function CreatorsMiniPitch({ locale }: Props) {
  const es = locale === 'es'
  const bullets = es
    ? ['Publica artículos y consultas con tu nombre.', 'Tu audiencia vota con certeza de 1 a 10.', 'Conecta tu trabajo con causas reales.']
    : ['Publish articles and consultations under your name.', 'Your audience votes with 1–10 certainty.', 'Connect your work to real causes.']

  return (
    <section className="cc-dark-surface border-t border-cc-border px-4 py-14 md:px-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[#2d3748] bg-[#151b23]">
        <div className="grid grid-cols-1 gap-8 p-5 sm:p-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:gap-10">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#c4b5fd]">
              <PenLine className="h-3.5 w-3.5" />
              {es ? 'Para creadores' : 'For creators'}
            </p>
            <h2 className="mt-4 text-2xl font-bold leading-tight text-[#ffffff] sm:text-3xl">
              {es ? 'Escribe con nosotros y genera impacto real.' : 'Write with us and create real impact.'}
            </h2>
            <ul className="mt-5 space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm leading-relaxed text-[#cbd5e1] sm:text-base">
                  <Sparkles className="mt-1 h-4 w-4 shrink-0 text-[#c4b5fd]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/creators"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-5 py-3 text-sm font-semibold text-[#ffffff] transition-colors hover:bg-[#5b21b6]"
              >
                {es ? 'Crear cuenta de creador' : 'Create creator account'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/blog"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#3b4757] px-5 py-3 text-sm font-medium text-[#e2e8f0] transition-colors hover:border-violet-300/60"
              >
                {es ? 'Leer el blog' : 'Read the blog'}
              </Link>
            </div>
          </div>

          {/* Illustrative article preview — decorative. */}
          <div className="min-w-0" aria-hidden="true">
            <div className="rounded-xl border border-[#2d3748] bg-[#0b1016] p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6d28d9] text-xs font-bold text-[#ffffff]">TÚ</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#ffffff]">{es ? 'Tu nombre · Creador' : 'Your name · Creator'}</p>
                  <p className="text-[11px] text-[#a3b1c2]">{es ? 'Ejemplo de publicación' : 'Example post'}</p>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold leading-snug text-[#ffffff]">
                {es ? '¿Debería tu colonia tener más ciclovías?' : 'Should your neighborhood get more bike lanes?'}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#2d3748]">
                <div className="h-full w-2/3 rounded-full bg-[#8b5cf6]" />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#a3b1c2]">
                <Heart className="h-3.5 w-3.5 text-[#c4b5fd]" />
                {es ? 'Tus lectores votan y opinan' : 'Your readers vote and weigh in'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
