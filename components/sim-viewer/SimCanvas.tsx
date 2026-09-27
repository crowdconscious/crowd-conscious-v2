'use client'

import { useEffect, useMemo, useRef } from 'react'
import type {
  SimulationOptionAggregate,
  SimulationReplayOption,
  SimulationReplayPayload,
  SimulationReplayVote,
  SimulationViewerBeat,
} from '@/types/simulation-replay'
import {
  computeAgentPositions,
  confidenceToTopFraction,
} from '@/lib/sim-viewer/positions'
import { SimMark } from '@/components/sim-viewer/SimMark'

type Props = {
  data: SimulationReplayPayload
  beat: SimulationViewerBeat
  votedCount: number
  /** Imperative land notification — kept for future capture hooks. */
  lastLandedIndex: number | null
  onDotActivate?: (personaKey: string) => void
}

const AXIS_TICKS = [10, 8, 6, 4, 2] as const

function pctLabel(share: number): string {
  return `${Math.round(share * 100)}%`
}

function optionAggregate(
  aggregates: SimulationOptionAggregate[],
  optionId: string
): SimulationOptionAggregate | undefined {
  return aggregates.find((a) => a.optionId === optionId)
}

/**
 * Column scatter canvas. Dots use CSS transforms; landing updates mutate
 * DOM class/style via refs to avoid re-rendering all 150 nodes per vote.
 */
export function SimCanvas({
  data,
  beat,
  votedCount,
  onDotActivate,
}: Props) {
  const positions = useMemo(
    () => computeAgentPositions(data.run.id, data.votes.length),
    [data.run.id, data.votes.length]
  )
  const optionIndex = useMemo(() => {
    const map = new Map<string, number>()
    data.pulse.options.forEach((o, i) => map.set(o.id, i))
    return map
  }, [data.pulse.options])

  const dotRefs = useRef<(HTMLButtonElement | null)[]>([])
  const prevVoted = useRef(0)

  // Reset / advance dots imperatively when votedCount changes
  useEffect(() => {
    const prev = prevVoted.current
    if (votedCount < prev) {
      // Restart — return all to lattice
      for (let i = 0; i < data.votes.length; i++) {
        const el = dotRefs.current[i]
        if (!el) continue
        el.dataset.state = 'lattice'
        el.classList.remove('sim-dot--landed', 'sim-dot--glow')
        applyLatticeTransform(el, positions[i]!)
      }
    } else {
      for (let i = prev; i < votedCount; i++) {
        const el = dotRefs.current[i]
        const vote = data.votes[i]
        const pos = positions[i]
        if (!el || !vote || !pos) continue
        const col = optionIndex.get(vote.optionId) ?? 0
        el.dataset.state = 'voted'
        el.classList.add('sim-dot--landed', 'sim-dot--glow')
        applyColumnTransform(el, col, data.pulse.options.length, vote, pos)
        window.setTimeout(() => {
          el.classList.remove('sim-dot--glow')
        }, 450)
      }
    }
    prevVoted.current = votedCount
  }, [votedCount, data.votes, data.pulse.options.length, optionIndex, positions])

  // Initial lattice placement
  useEffect(() => {
    for (let i = 0; i < data.votes.length; i++) {
      const el = dotRefs.current[i]
      const pos = positions[i]
      if (!el || !pos) continue
      if ((Number(el.dataset.votedIndex ?? -1) || -1) >= 0 && votedCount > i) {
        continue
      }
      applyLatticeTransform(el, pos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / data identity
  }, [data.run.id])

  const showPercents = beat === 'settle' || beat === 'reveal' || beat === 'done'
  const showReveal = beat === 'reveal' || beat === 'done'
  const options = data.pulse.options

  return (
    <div
      className="sim-canvas relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-b from-[#121820] via-[#0f1419] to-[#0c1015]"
      data-sim-canvas="true"
    >
      <SimMark subtitle="reproducción" />

      <div className="relative flex min-h-0 flex-1 px-2 pb-2 pt-10 sm:px-3 sm:pt-11">
        {/* Y axis */}
        <div className="relative mr-1 flex w-10 shrink-0 flex-col justify-between py-2 sm:w-14">
          <span className="absolute -left-1 top-1/2 origin-center -translate-y-1/2 -rotate-90 whitespace-nowrap text-[9px] uppercase tracking-wider text-slate-500 sm:text-[10px]">
            certeza declarada
          </span>
          <div className="flex h-full flex-col justify-between py-1 pl-0 sm:pl-1">
            {AXIS_TICKS.map((t) => (
              <span
                key={t}
                className="text-right font-mono text-[9px] text-slate-500 sm:text-[10px]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Plot */}
        <div className="relative min-h-[220px] flex-1 sm:min-h-[280px]">
          {/* Horizontal grid */}
          {AXIS_TICKS.map((t) => {
            const top = confidenceToTopFraction(t) * 100
            return (
              <div
                key={t}
                className="pointer-events-none absolute left-0 right-0 border-t border-slate-700/40"
                style={{ top: `${top}%` }}
              />
            )
          })}

          {/* Columns */}
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
            }}
          >
            {options.map((opt) => (
              <ColumnFrame
                key={opt.id}
                option={opt}
                sim={optionAggregate(data.simAggregates, opt.id)}
                real={
                  data.realAggregates
                    ? optionAggregate(data.realAggregates, opt.id)
                    : undefined
                }
                showPercents={showPercents}
                showReveal={showReveal}
              />
            ))}
          </div>

          {/* Dots layer */}
          <div className="absolute inset-0">
            {data.votes.map((vote, i) => (
              <button
                key={vote.persona.personaKey}
                type="button"
                ref={(el) => {
                  dotRefs.current[i] = el
                }}
                data-persona-key={vote.persona.personaKey}
                data-sequence={vote.sequenceIndex}
                aria-label={`${vote.persona.displayName}, ${vote.persona.colonia ?? vote.persona.alcaldia}`}
                className="sim-dot absolute left-0 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/60 bg-transparent opacity-70 transition-[left,top,opacity,transform,box-shadow] duration-500 ease-out will-change-[left,top] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:h-3 sm:w-3"
                style={{ transform: 'translate(-50%, -50%)' }}
                onClick={() => onDotActivate?.(vote.persona.personaKey)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ColumnFrame({
  option,
  sim,
  real,
  showPercents,
  showReveal,
}: {
  option: SimulationReplayOption
  colIdx: number
  colCount: number
  sim: SimulationOptionAggregate | undefined
  real: SimulationOptionAggregate | undefined
  showPercents: boolean
  showReveal: boolean
}) {
  return (
    <div className="relative border-r border-slate-700/50 last:border-r-0">
      {/* Empty lattice hint circles in first column feel — subtle density guide */}
      <div className="pointer-events-none absolute inset-x-2 inset-y-3 opacity-[0.12]">
        {Array.from({ length: 8 }).map((_, r) =>
          Array.from({ length: 3 }).map((_, c) => (
            <span
              key={`${r}-${c}`}
              className="absolute h-2 w-2 rounded-full border border-slate-400"
              style={{
                left: `${20 + c * 30}%`,
                top: `${10 + r * 11}%`,
              }}
            />
          ))
        )}
      </div>

      {/* Real share rule (Beat 4) */}
      {showReveal && real ? (
        <div
          className="pointer-events-none absolute left-1 right-1 z-10"
          style={{ top: `${(1 - real.share) * 72 + 8}%` }}
        >
          <div className="h-0.5 w-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.55)]" />
          <div className="mt-0.5 text-center font-mono text-[9px] font-semibold text-emerald-300 sm:text-[10px]">
            real {pctLabel(real.share)} · {real.meanConfidence.toFixed(1)}
          </div>
        </div>
      ) : null}

      {/* Footer labels */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#0f1419] via-[#0f1419]/90 to-transparent px-1 pb-1 pt-6 text-center">
        <div
          className={`font-semibold tabular-nums transition-opacity duration-500 ${
            showPercents ? 'opacity-100' : 'opacity-0'
          } text-lg text-amber-200 sm:text-2xl`}
        >
          {sim ? pctLabel(sim.share) : '—'}
        </div>
        <div className="truncate text-[10px] text-slate-400 sm:text-xs">
          {option.label}
        </div>
      </div>
    </div>
  )
}

type Pos = ReturnType<typeof computeAgentPositions>[number]

function applyLatticeTransform(el: HTMLElement, pos: Pos): void {
  // Waiting bay on the left ~18% of the plot (Beat 1 lattice).
  const x = 4 + pos.latticeX * 14
  const y = 8 + pos.latticeY * 70
  el.style.left = `${x}%`
  el.style.top = `${y}%`
  el.style.transform = 'translate(-50%, -50%)'
  el.style.opacity = '0.55'
  el.classList.remove('sim-dot--landed', 'sim-dot--glow')
}

function applyColumnTransform(
  el: HTMLElement,
  col: number,
  colCount: number,
  vote: SimulationReplayVote,
  pos: Pos
): void {
  const colWidth = 100 / colCount
  const x = col * colWidth + colWidth * (0.5 + pos.columnJitter * 0.35)
  const y = confidenceToTopFraction(vote.confidence) * 100
  el.style.left = `${x}%`
  el.style.top = `${y}%`
  el.style.transform = 'translate(-50%, -50%) scale(1)'
  el.style.opacity = '1'
  el.classList.add('sim-dot--landed')
}
