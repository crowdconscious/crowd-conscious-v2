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
  lastLandedIndex: number | null
  compact?: boolean
  /** Capture 9:16 / 1:1 — larger dots + labels for phone Reels. */
  phoneScale?: boolean
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
 * Column scatter canvas. Dots use CSS left/top; landing updates mutate
 * DOM via refs to avoid re-rendering all 150 nodes per vote.
 */
export function SimCanvas({
  data,
  beat,
  votedCount,
  compact = false,
  phoneScale = false,
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

  useEffect(() => {
    const prev = prevVoted.current
    if (votedCount < prev) {
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

  useEffect(() => {
    for (let i = 0; i < data.votes.length; i++) {
      const el = dotRefs.current[i]
      const pos = positions[i]
      if (!el || !pos) continue
      if (votedCount > i) continue
      applyLatticeTransform(el, pos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / data identity
  }, [data.run.id])

  const showPercents = beat === 'settle' || beat === 'reveal' || beat === 'endcard' || beat === 'done'
  const showReveal = beat === 'reveal' || beat === 'endcard' || beat === 'done'
  const options = data.pulse.options
  const footerH = phoneScale ? '3.75rem' : compact ? '2.75rem' : '3.25rem'
  const axisW = phoneScale ? 'w-11' : compact ? 'w-8' : 'w-10 sm:w-12'
  const axisLabelCls = phoneScale
    ? 'text-[11px]'
    : compact
      ? 'text-[8px]'
      : 'text-[9px] sm:text-[10px]'
  const tickCls = phoneScale
    ? 'text-[11px]'
    : compact
      ? 'text-[8px]'
      : 'text-[9px] sm:text-[10px]'
  const dotCls = phoneScale
    ? 'h-3.5 w-3.5 sm:h-4 sm:w-4'
    : compact
      ? 'h-2 w-2'
      : 'h-2.5 w-2.5 sm:h-3 sm:w-3'
  const padCls = phoneScale
    ? 'px-2 pb-2 pt-10'
    : compact
      ? 'px-1.5 pb-1.5 pt-8'
      : 'px-2 pb-2 pt-9 sm:px-3 sm:pt-10'

  return (
    <div
      className="sim-canvas relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-b from-[#121820] via-[#0f1419] to-[#0c1015]"
      data-sim-canvas="true"
    >
      <SimMark subtitle="reproducción" compact={compact} phoneScale={phoneScale} />

      <div className={`relative flex min-h-0 flex-1 ${padCls}`}>
        {/* Y axis — vertical label in its own gutter (no overlap with dots) */}
        <div className={`relative flex shrink-0 items-stretch ${axisW}`}>
          <div
            className={`flex w-3 shrink-0 items-center justify-center ${
              phoneScale ? 'mr-1' : compact ? 'mr-0.5' : 'mr-1'
            }`}
            aria-hidden="true"
          >
            <span
              className={`origin-center whitespace-nowrap font-medium uppercase tracking-wider text-slate-500 ${axisLabelCls}`}
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              certeza declarada
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-between py-1">
            {AXIS_TICKS.map((t) => (
              <span
                key={t}
                className={`text-right font-mono text-slate-500 ${tickCls}`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Plot — reserve bottom band for % + labels so dots don't collide */}
        <div className="relative min-h-0 flex-1">
          <div
            className="absolute inset-x-0 top-0"
            style={{ bottom: footerH }}
          >
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

            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
              }}
            >
              {options.map((opt, colIdx) => (
                <div
                  key={opt.id}
                  className="relative border-r border-slate-700/50 last:border-r-0"
                >
                  {colIdx === 0 ? (
                    <div className="pointer-events-none absolute inset-x-2 inset-y-3 opacity-[0.1]">
                      {Array.from({ length: 5 }).map((_, r) =>
                        Array.from({ length: 2 }).map((_, c) => (
                          <span
                            key={`${r}-${c}`}
                            className="absolute h-1.5 w-1.5 rounded-full border border-slate-500"
                            style={{
                              left: `${25 + c * 35}%`,
                              top: `${14 + r * 16}%`,
                            }}
                          />
                        ))
                      )}
                    </div>
                  ) : null}

                  {showReveal
                    ? (() => {
                        const real = data.realAggregates
                          ? optionAggregate(data.realAggregates, opt.id)
                          : undefined
                        if (!real) return null
                        return (
                          <div
                            className="pointer-events-none absolute left-1 right-1 z-10"
                            style={{ top: `${(1 - real.share) * 78 + 6}%` }}
                          >
                            <div className="h-0.5 w-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.55)]" />
                            <div
                              className={`mt-0.5 text-center font-mono font-semibold text-emerald-300 ${
                                phoneScale
                                  ? 'text-[11px] sm:text-xs'
                                  : compact
                                    ? 'text-[8px]'
                                    : 'text-[9px] sm:text-[10px]'
                              }`}
                            >
                              real {pctLabel(real.share)} ·{' '}
                              {real.meanConfidence.toFixed(1)}
                            </div>
                          </div>
                        )
                      })()
                    : null}
                </div>
              ))}
            </div>

            {/* Dots layer — only over the plot band, not the footer labels */}
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
                  className={`sim-dot absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/60 bg-transparent opacity-70 transition-[left,top,opacity,box-shadow] duration-500 ease-out will-change-[left,top] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${dotCls}`}
                  style={{ transform: 'translate(-50%, -50%)' }}
                  onClick={() => onDotActivate?.(vote.persona.personaKey)}
                />
              ))}
            </div>
          </div>

          {/* Column footers — wrap labels, never truncate Espacio público */}
          <div
            className="absolute inset-x-0 bottom-0 grid"
            style={{
              gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
              height: footerH,
            }}
          >
            {options.map((opt) => {
              const sim = optionAggregate(data.simAggregates, opt.id)
              return (
                <ColumnFooter
                  key={opt.id}
                  option={opt}
                  sim={sim}
                  showPercents={showPercents}
                  compact={compact}
                  phoneScale={phoneScale}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ColumnFooter({
  option,
  sim,
  showPercents,
  compact,
  phoneScale,
}: {
  option: SimulationReplayOption
  sim: SimulationOptionAggregate | undefined
  showPercents: boolean
  compact: boolean
  phoneScale: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-end px-0.5 pb-0.5 text-center">
      <div
        className={`font-semibold tabular-nums text-amber-200 transition-opacity duration-500 ${
          showPercents ? 'opacity-100' : 'opacity-0'
        } ${
          phoneScale
            ? 'text-xl sm:text-2xl'
            : compact
              ? 'text-sm'
              : 'text-base sm:text-xl'
        }`}
      >
        {sim ? pctLabel(sim.share) : '—'}
      </div>
      <div
        className={`max-w-full text-balance leading-tight text-slate-400 ${
          phoneScale
            ? 'text-xs sm:text-sm'
            : compact
              ? 'text-[9px]'
              : 'text-[10px] sm:text-xs'
        }`}
      >
        {option.label}
      </div>
    </div>
  )
}

type Pos = ReturnType<typeof computeAgentPositions>[number]

function applyLatticeTransform(el: HTMLElement, pos: Pos): void {
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
