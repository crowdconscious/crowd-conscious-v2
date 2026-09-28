'use client'

import { useEffect, useId, useRef } from 'react'
import type {
  PersonaGrounding,
  SimulationReplayVote,
} from '@/types/simulation-replay'
import { PersonaAbstractMark } from '@/components/sim-viewer/PersonaAbstractMark'
import { PERSONA_GROUNDING_LINE } from '@/lib/sim-viewer/persona-mark'

export { PERSONA_GROUNDING_LINE }

const MISSING_GROUNDING_COPY =
  'Datos de origen no disponibles para esta corrida'

const EXAMPLE_GROUNDING_BANNER =
  'Valores de ejemplo, no son cifras reales del Censo'

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
                value={persona.nseBand ?? '—'}
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

          <PersonaDataBasis
            grounding={persona.grounding}
            alcaldia={persona.alcaldia}
            colonia={persona.colonia}
            agebCode={persona.agebCode}
          />
        </div>

        <p
          className="shrink-0 border-t border-slate-800 px-4 py-3 text-[11px] leading-relaxed text-slate-500 sm:px-5"
          data-persona-grounding="1"
        >
          {PERSONA_GROUNDING_LINE}
        </p>
      </div>
    </div>
  )
}

function PersonaDataBasis({
  grounding,
  alcaldia,
  colonia,
  agebCode,
}: {
  grounding: PersonaGrounding | undefined
  alcaldia: string
  colonia: string | null
  agebCode: string | null
}) {
  return (
    <section
      aria-label="Datos de origen"
      className="rounded-lg border border-slate-700/70 bg-slate-900/40 p-3 sm:p-3.5"
      data-persona-data-basis="1"
      data-example={grounding?.isExample ? '1' : undefined}
    >
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        ¿En qué datos se basa?
      </h3>

      {!grounding ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {MISSING_GROUNDING_COPY}
        </p>
      ) : (
        <div className="mt-2.5 space-y-3.5">
          {grounding.isExample ? (
            <p
              className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-amber-100"
              role="status"
              data-grounding-example="1"
            >
              {EXAMPLE_GROUNDING_BANNER}
            </p>
          ) : null}

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Fuente(s)
            </h4>
            <ul className="mt-1.5 space-y-1.5">
              {grounding.sources.map((src) => (
                <li
                  key={`${src.name}-${src.year}`}
                  className="text-sm leading-snug"
                >
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-300 underline-offset-2 hover:text-sky-200 hover:underline"
                  >
                    {src.name} {src.year}
                  </a>
                  {src.table ? (
                    <span className="text-slate-500"> · {src.table}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Su AGEB
            </h4>
            <p className="mt-1 font-mono text-[12px] text-slate-300">
              {grounding.ageb.code || agebCode || '—'}
              <span className="text-slate-500">
                {' '}
                · {alcaldia}
                {colonia ? ` · ${colonia}` : ''}
              </span>
              {grounding.ageb.population != null ? (
                <span className="text-slate-500">
                  {' '}
                  · pob. {grounding.ageb.population.toLocaleString('es-MX')}
                </span>
              ) : null}
            </p>
            {grounding.ageb.marginals.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {grounding.ageb.marginals.map((m) => (
                  <li key={m.label}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-slate-400">{m.label}</span>
                      <span className="shrink-0 font-medium tabular-nums text-slate-200">
                        {m.value}
                      </span>
                    </div>
                    {typeof m.share === 'number' ? (
                      <div
                        className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"
                        role="meter"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(
                          Math.max(0, Math.min(1, m.share)) * 100
                        )}
                        aria-label={m.label}
                      >
                        <div
                          className="h-full rounded-full bg-slate-400/70"
                          style={{
                            width: `${Math.max(0, Math.min(1, m.share)) * 100}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Cómo se construyó
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {grounding.method}
            </p>
          </div>
        </div>
      )}
    </section>
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
