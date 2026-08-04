import Link from 'next/link'

/**
 * "IA vs. Realidad" reveal module (§5.7) — the post-close comparison of a real
 * Pulse against its synthetic-agent panel.
 *
 * Total separation (§1): rendered ONLY under the persistent amber `SIMULACIÓN IA`
 * badge (green = real, amber = simulated, platform-wide) and never presented as
 * real opinion — the simulated shares are drawn as a distinct amber track next to
 * the real (emerald) one, and the quote is captioned as a simulated voice. This
 * component is purely presentational: it only ever receives the minimal, already
 * revealed comparison the loader attaches when the full-reveal gate holds
 * (SIM_REVEAL_ENABLED + revealed run + Pulse closed). The anchoring guardrail is
 * enforced in the data layer (app/pulse/[id]/page.tsx), never here.
 */

/** One option's real vs. simulated share (both 0–1). No confidence internals. */
export type PulseSimPerOption = {
  option: string
  real_share: number
  sim_share: number
}

/**
 * The full-reveal payload. Deliberately minimal: the Divergence Index, per-option
 * real/sim shares, and one representative simulated quote. No raw votes, no
 * reasonings, no confidence maps ever cross to the client.
 */
export type PulseSimReveal = {
  divergenceIndex: number
  perOption: PulseSimPerOption[]
  cita: string | null
}

const SIM_BADGE_CLASS =
  'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30'

function pct(share: number): number {
  if (!Number.isFinite(share)) return 0
  return Math.max(0, Math.min(100, Math.round(share * 100)))
}

export default function PulseSimRevealModule({
  locale,
  reveal,
}: {
  locale: 'es' | 'en'
  reveal: PulseSimReveal
}) {
  const index = Math.round(
    Number.isFinite(reveal.divergenceIndex) ? reveal.divergenceIndex : 0
  )

  return (
    <section className="pulse-section mt-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={SIM_BADGE_CLASS}>SIMULACIÓN IA</span>
        <h3 className="text-sm font-semibold text-amber-200">
          {locale === 'es' ? 'IA vs. Realidad' : 'AI vs. Reality'}
        </h3>
      </div>

      <p className="text-xs leading-relaxed text-amber-200/70">
        {locale === 'es'
          ? 'Antes de que abriera este Pulse, un panel de personas simuladas por IA votó con las mismas reglas. Comparamos su lectura contra la tuya real. Estos números son simulados — nunca cuentan en el resultado real.'
          : 'Before this Pulse opened, a panel of AI-simulated people voted with the same rules. We compare their read against the real one. These numbers are simulated — they never count toward the real result.'}
      </p>

      {/* Divergence Index headline + 0–100 explainer */}
      <div className="mt-4 flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-300/80">
            {locale === 'es' ? 'Índice de Divergencia' : 'Divergence Index'}
          </p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-amber-300">
            {index}
            <span className="text-lg text-amber-400/60">/100</span>
          </p>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-amber-200/70">
          {locale === 'es'
            ? '0 = la IA nos leyó perfecto · 100 = no nos conoce en absoluto.'
            : '0 = the AI read us perfectly · 100 = it doesn\u2019t know us at all.'}
        </p>
      </div>

      {/* Per-option comparison: real (emerald) vs simulated (amber) shares */}
      {reveal.perOption.length > 0 ? (
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" />
              {locale === 'es' ? 'Real' : 'Real'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-amber-400" />
              {locale === 'es' ? 'Simulación IA' : 'AI simulation'}
            </span>
          </div>

          {reveal.perOption.map((po) => {
            const realPct = pct(po.real_share)
            const simPct = pct(po.sim_share)
            return (
              <div key={po.option}>
                <p className="mb-1.5 text-sm font-medium text-slate-200">{po.option}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${realPct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-emerald-300">
                      {realPct}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${simPct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-amber-300">
                      {simPct}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* One representative simulated quote (plain text, never real opinion) */}
      {reveal.cita ? (
        <figure className="mt-5 border-l-2 border-amber-500/40 py-1.5 pl-3">
          <blockquote className="text-sm italic leading-relaxed text-amber-100/90">
            &ldquo;{reveal.cita}&rdquo;
          </blockquote>
          <figcaption className="mt-1 text-[11px] text-amber-300/60">
            {locale === 'es'
              ? 'Voz simulada por IA — no es una opinión real.'
              : 'AI-simulated voice — not a real opinion.'}
          </figcaption>
        </figure>
      ) : null}

      <p className="mt-4 text-[11px] text-slate-500">
        {locale === 'es' ? (
          <>
            Conoce cómo construimos y auditamos esta simulación en{' '}
            <Link
              href="/metodologia-simulacion"
              className="text-amber-300 underline-offset-2 hover:underline"
            >
              nuestra metodología
            </Link>
            .
          </>
        ) : (
          <>
            Learn how we build and audit this simulation in{' '}
            <Link
              href="/metodologia-simulacion"
              className="text-amber-300 underline-offset-2 hover:underline"
            >
              our methodology
            </Link>
            .
          </>
        )}
      </p>
    </section>
  )
}
