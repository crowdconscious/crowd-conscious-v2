'use client'

import type { SimulationReplayVote } from '@/types/simulation-replay'

type Props = {
  votes: SimulationReplayVote[]
  optionsById: Map<string, string>
  compact?: boolean
  /** Phone-legible capture scale (9:16 / 1:1). Fewer, larger rows. */
  phoneScale?: boolean
}

export function SimReasoningFeed({
  votes,
  optionsById,
  compact = false,
  phoneScale = false,
}: Props) {
  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-[#141a22]"
      aria-label="Razonamiento de los agentes"
    >
      <header
        className={`shrink-0 border-b border-slate-700/60 bg-slate-800/40 ${
          phoneScale ? 'px-3.5 py-2.5' : 'px-2.5 py-1.5 sm:px-3'
        }`}
      >
        <h2
          className={`font-semibold uppercase tracking-wide text-slate-300 ${
            phoneScale ? 'text-sm' : 'text-[10px] sm:text-xs'
          }`}
        >
          Razonamiento de los agentes
        </h2>
      </header>
      <ul className="min-h-0 flex-1 space-y-0 overflow-y-auto overscroll-contain">
        {votes.length === 0 ? (
          <li
            className={`px-2.5 py-3 text-slate-500 sm:px-3 ${
              phoneScale ? 'text-base' : 'text-[11px]'
            }`}
          >
            Esperando votos del panel sintético…
          </li>
        ) : (
          votes.map((vote) => {
            const label = optionsById.get(vote.optionId) ?? '—'
            const colonia = vote.persona.colonia ?? vote.persona.alcaldia
            return (
              <li
                key={`feed-${vote.sequenceIndex}`}
                className={`sim-feed-item border-b border-slate-800/80 ${
                  phoneScale
                    ? 'px-3.5 py-3'
                    : 'px-2.5 py-1.5 sm:px-3 sm:py-2'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={`min-w-0 truncate text-slate-400 ${
                      phoneScale
                        ? 'text-sm'
                        : compact
                          ? 'text-[10px]'
                          : 'text-[11px] sm:text-xs'
                    }`}
                  >
                    <span className="font-medium text-slate-200">
                      {vote.persona.displayName}
                    </span>
                    {', '}
                    {vote.persona.age}
                    {' · '}
                    {colonia}
                    {' · NSE '}
                    {vote.persona.nseBand}
                  </p>
                  <span
                    className={`shrink-0 font-mono text-slate-400 ${
                      phoneScale ? 'text-sm' : 'text-[10px] sm:text-[11px]'
                    }`}
                  >
                    {vote.confidence.toFixed(1)}
                  </span>
                </div>
                <p
                  className={`mt-1 leading-snug text-slate-200 ${
                    phoneScale
                      ? 'line-clamp-3 text-base'
                      : compact
                        ? 'line-clamp-2 text-[11px] text-slate-300'
                        : 'line-clamp-2 text-[12px] text-slate-300 sm:text-sm'
                  }`}
                >
                  <span className="font-semibold text-amber-200">{label}.</span>{' '}
                  {vote.reasoning}
                </p>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
