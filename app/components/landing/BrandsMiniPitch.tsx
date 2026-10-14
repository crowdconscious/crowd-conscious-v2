import Link from 'next/link'
import { ArrowRight, Building2, Gauge, Lock, ShieldCheck } from 'lucide-react'

type Props = {
  locale: 'es' | 'en'
}

/**
 * Homepage "Para organizaciones" showcase — the revenue product.
 * Self-contained dark card (cc-dark-surface) so it renders identically in
 * light and dark themes. All colours are explicit hex to bypass the global
 * light-mode slate overrides; muted text #a3b1c2 on #111821 ≈ 8.6:1.
 *
 * The split bar is a clearly labelled DEMO ("Hospital Ejemplo") — no real
 * client data, no invented platform stats. "Firme" = certainty 8–10.
 */
const SEGMENTS = [
  { key: 'firmYes', pct: 58, bg: '#047857', fg: '#ffffff', es: 'Sí, firme', en: 'Firm yes' },
  { key: 'tentYes', pct: 33, bg: '#bbf7d0', fg: '#052e16', es: 'Sí, tentativo', en: 'Tentative yes' },
  { key: 'tentNo', pct: 6, bg: '#fed7aa', fg: '#431407', es: 'No, tentativo', en: 'Tentative no' },
  { key: 'firmNo', pct: 3, bg: '#c2410c', fg: '#ffffff', es: 'No, firme', en: 'Firm no' },
] as const

export function BrandsMiniPitch({ locale }: Props) {
  const es = locale === 'es'
  const benefits = es
    ? [
        { icon: Gauge, title: 'Certeza de 1 a 10 en cada respuesta', body: 'No solo sí o no: sabe quién lo dice con firmeza y quién duda.' },
        { icon: ShieldCheck, title: 'Resultados que nadie edita', body: 'Ni usted ni nosotros: lo que votan sus usuarios es lo que ve.' },
        { icon: Lock, title: 'Sin datos personales', body: 'Sus usuarios responden sin entregar nombre, correo ni teléfono.' },
      ]
    : [
        { icon: Gauge, title: '1–10 certainty on every answer', body: 'Not just yes or no: see who says it firmly and who hesitates.' },
        { icon: ShieldCheck, title: 'Results nobody edits', body: 'Not you, not us: what your users vote is what you see.' },
        { icon: Lock, title: 'No personal data', body: 'Your users answer without giving a name, email or phone.' },
      ]

  return (
    <section className="cc-dark-surface border-t border-cc-border px-4 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[#047857]/50 bg-[#111821] shadow-2xl shadow-emerald-900/30">
        <div className="grid grid-cols-1 gap-10 p-5 sm:p-8 md:p-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#6ee7b7]">
              <Building2 className="h-3.5 w-3.5" />
              {es ? 'Para organizaciones' : 'For organizations'}
            </p>
            <h2 className="mt-5 text-3xl font-bold leading-tight text-[#ffffff] sm:text-4xl md:text-5xl">
              {es ? 'Sepa qué tan seguros están sus usuarios.' : 'Know how sure your users really are.'}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#cbd5e1] sm:text-lg">
              {es
                ? 'Una encuesta le dice cuántos están satisfechos. Crowd Conscious le dice cuántos lo sostienen con firmeza — y dónde está el riesgo real.'
                : 'A survey tells you how many are satisfied. Crowd Conscious tells you how many stand by it firmly — and where the real risk is.'}
            </p>

            <ul className="mt-7 space-y-4">
              {benefits.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#047857]/25 text-[#6ee7b7]">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-[#ffffff]">{title}</span>
                    <span className="block text-sm leading-relaxed text-[#a3b1c2]">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/organizaciones/demo"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#047857] px-6 py-3 text-base font-semibold text-[#ffffff] shadow-lg shadow-emerald-900/40 transition-colors hover:bg-[#065f46]"
              >
                {es ? 'Ver demo' : 'See demo'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/organizaciones"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#3b4757] bg-[#1a2029] px-6 py-3 text-base font-medium text-[#e2e8f0] transition-colors hover:border-emerald-400/60"
              >
                {es ? 'Ver organizaciones' : 'See organizations'}
              </Link>
            </div>
          </div>

          {/* Demo reading card — illustrative example, not client data. */}
          <div className="min-w-0" aria-label={es ? 'Ejemplo de lectura (demo)' : 'Example reading (demo)'}>
            <div className="rounded-2xl border border-[#2d3748] bg-[#0b1016] p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#ffffff]">Hospital Ejemplo</p>
                <span className="rounded-full border border-amber-300/50 bg-amber-300/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#fcd34d]">
                  {es ? 'Ejemplo demo' : 'Demo example'}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#a3b1c2]">
                {es ? '¿Recomendaría este hospital a un familiar?' : 'Would you recommend this hospital to a relative?'}
              </p>

              <p className="mt-5 text-xl font-bold leading-snug text-[#ffffff] sm:text-2xl">
                {es ? (
                  <>De su 91% que recomendaría el hospital, <span className="text-[#6ee7b7]">58% lo dijo con firmeza.</span></>
                ) : (
                  <>Of the 91% who would recommend the hospital, <span className="text-[#6ee7b7]">58% said it firmly.</span></>
                )}
              </p>

              <div className="mt-5 flex h-11 w-full overflow-hidden rounded-lg ring-1 ring-[#2d3748]" role="img"
                aria-label={SEGMENTS.map((s) => `${es ? s.es : s.en} ${s.pct}%`).join(', ')}>
                {SEGMENTS.map((s) => (
                  <div key={s.key} className="flex items-center justify-center text-xs font-bold"
                    style={{ width: `${s.pct}%`, backgroundColor: s.bg, color: s.fg }}>
                    {s.pct >= 10 ? `${s.pct}%` : ''}
                  </div>
                ))}
              </div>

              <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
                {SEGMENTS.map((s) => (
                  <li key={s.key} className="flex min-w-0 items-center gap-2 text-xs text-[#cbd5e1]">
                    <span className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-white/20" style={{ backgroundColor: s.bg }} />
                    <span className="truncate">{es ? s.es : s.en}</span>
                    <span className="ml-auto font-semibold text-[#ffffff]">{s.pct}%</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#2d3748] pt-4">
                <div className="rounded-lg bg-[#111821] p-3">
                  <p className="text-[11px] uppercase tracking-wider text-[#a3b1c2]">{es ? 'Firme' : 'Firm'}</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#ffffff]">{es ? 'Certeza 8–10' : 'Certainty 8–10'}</p>
                </div>
                <div className="rounded-lg bg-[#111821] p-3">
                  <p className="text-[11px] uppercase tracking-wider text-[#a3b1c2]">{es ? 'Tentativo' : 'Tentative'}</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#ffffff]">{es ? 'Certeza 1–7' : 'Certainty 1–7'}</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-[#a3b1c2]">
                {es
                  ? 'Datos ilustrativos de una organización ficticia. Ninguna cifra corresponde a un cliente real.'
                  : 'Illustrative data from a fictional organization. No figure belongs to a real client.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
