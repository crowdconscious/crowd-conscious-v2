'use client'

import type { SimulationReplayVote } from '@/types/simulation-replay'

type Props = {
  votes: SimulationReplayVote[]
  optionsById: Map<string, string>
}

export function SimReasoningFeed({ votes, optionsById }: Props) {
  return (
    <section
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-[#141a22]"
      aria-label="Razonamiento de los agentes"
    >
      <header className="shrink-0 border-b border-slate-700/60 bg-slate-800/40 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300 sm:text-sm">
          Razonamiento de los agentes
        </h2>
      </header>
      <ul className="min-h-0 flex-1 space-y-0 overflow-y-auto">
        {votes.length === 0 ? (
          <li className="px-3 py-4 text-xs text-slate-500">
            Esperando votos del panel sintético…
          </li>
        ) : (
          votes.map((vote) => {
            const label = optionsById.get(vote.optionId) ?? '—'
            const colonia = vote.persona.colonia ?? vote.persona.alcaldia
            return (
              <li
                key={`${vote.sequenceIndex}-${vote.persona.personaKey}`}
                className="sim-feed-item border-b border-slate-800/80 px-3 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[11px] text-slate-400 sm:text-xs">
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
                  <span className="shrink-0 font-mono text-[11px] text-slate-500">
                    {vote.confidence.toFixed(1)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-300 sm:text-sm">
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
