'use client'

import { useEffect, useId, useRef } from 'react'
import type { SimulationReplayVote } from '@/types/simulation-replay'
import { PersonaAbstractMark } from '@/components/sim-viewer/PersonaAbstractMark'
import { PERSONA_GROUNDING_LINE } from '@/lib/sim-viewer/persona-mark'

export { PERSONA_GROUNDING_LINE }
type Props = {
  vote: SimulationReplayVote | null
  optionLabel: string | null
  open: boolean
  onClose: () => void
}

/**
 * Persona inspector: side sheet on desktop, bottom sheet on mobile.
 * No face / avatar / photo — abstract mark only.
 */
export function PersonaInspector({
  vote,
  optionLabel,
  open,
  onClose,
}: Props) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    // Focus the close control so Escape / tab order land in the sheet.
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !vote) return null

  const { persona } = vote
  const confidencePct = Math.max(0, Math.min(100, (vote.confidence / 10) * 100))

  return (
    <div
      className="sim-persona-inspector fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end"
      role="presentation"
      data-persona-inspector="1"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Cerrar inspector de persona"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sim-persona-sheet relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden border-slate-700/80 bg-[#121820] shadow-2xl sm:max-h-none sm:w-[min(100%,400px)] sm:border-l"
        data-persona-key={persona.personaKey}
      >
        {/* Mobile drag affordance */}
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-600 sm:hidden"
          aria-hidden="true"
        />

        <header className="flex shrink-0 items-start gap-3 border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4">
          <PersonaAbstractMark
            nseBand={persona.nseBand}
            alcaldia={persona.alcaldia}
            size={52}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/90">
              Persona
            </p>
            <h2
              id={titleId}
              className="mt-0.5 text-base font-semibold leading-snug text-slate-100 sm:text-lg"
            >
              {persona.alcaldia}
              {persona.colonia ? (
                <span className="font-normal text-slate-400">
                  {' '}
                  · {persona.colonia}
                </span>
              ) : null}
            </h2>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              AGEB {persona.agebCode ?? '—'} · {persona.personaKey}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            Cerrar
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <section aria-label="Perfil demográfico">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
              <Field label="Edad" value={String(persona.age)} />
              <Field label="Sexo" value={persona.sex} />
              <Field label="Educación" value={persona.education} />
              <Field
                label="Tamaño del hogar"
                value={
                  persona.householdSize == null
                    ? '—'
                    : String(persona.householdSize)
                }
              />
              <Field
                label="Ocupación"
                value={persona.occupation}
                className="col-span-2"
              />
              <Field
                label="NSE (AMAI)"
                value={persona.nseBand}
                className="col-span-2"
              />
            </dl>
          </section>

          <section aria-label="Resumen de persona">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Resumen usado para el modelo
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              {persona.personaSummary}
            </p>
          </section>

          <section
            aria-label="Voto en esta simulación"
            className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 sm:p-3.5"
          >
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/90">
              Su voto en esta simulación
            </h3>
            <p className="mt-2 text-base font-semibold text-amber-100">
              {optionLabel ?? '—'}
            </p>
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">
                  Certeza
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-200">
                  {vote.confidence.toFixed(1)}
                  <span className="text-slate-500"> / 10</span>
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800"
                role="meter"
                aria-valuemin={1}
                aria-valuemax={10}
                aria-valuenow={vote.confidence}
                aria-label="Escala de certeza"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-300"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {vote.reasoning}
            </p>
          </section>

          <p
            className="border-t border-slate-800 pt-4 text-[11px] leading-relaxed text-slate-500"
            data-persona-grounding="1"
          >
            {PERSONA_GROUNDING_LINE}
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm capitalize text-slate-200">{value}</dd>
    </div>
  )
}
