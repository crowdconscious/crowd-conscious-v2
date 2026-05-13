'use client'

import { useId, useMemo, useState } from 'react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

export type LocationOption = {
  id: string
  slug: string
  name: string
  neighborhood: string | null
  city: string | null
}

export type RefinementMode = 'none' | 'partner' | 'street'

type Errors = {
  alcaldia?: string
  partner?: string
  street?: string
}

type Props = {
  locale: CitizenSignalsLocale
  /** The 16 CDMX alcaldías (broad bucket). Required selection. */
  alcaldias: ReadonlyArray<LocationOption>
  /** Every other active CDMX conscious_locations row (partner spots). */
  partnerLocations: ReadonlyArray<LocationOption>
  selectedAlcaldiaId: string
  refinementMode: RefinementMode
  selectedPartnerLocationId: string | null
  streetReference: string
  onChangeAlcaldia: (id: string) => void
  onChangeRefinementMode: (mode: RefinementMode) => void
  onChangePartnerLocation: (id: string | null) => void
  onChangeStreetReference: (value: string) => void
  errors?: Errors
}

/**
 * Two-stage location picker for the Citizen Signals compose wizard.
 *
 * Stage A — required. Pick one of the 16 CDMX alcaldías. The broad
 * "bucket" used by escalation/grouping logic.
 *
 * Stage B — optional refinement. Only shown after Stage A is set.
 *   - `partner`: pick a registered location inside the alcaldía (filtered
 *     by neighborhood/city text-match best-effort, since the schema has no
 *     parent-child link from a partner row to its alcaldía).
 *   - `street`: type a free-text street/intersection/landmark.
 *   - `none`:   skip refinement; the signal targets the alcaldía only.
 *
 * The three modes are mutually exclusive. Switching modes clears the
 * other modes' values so the wizard's localStorage draft never carries
 * stale precision data.
 */
export default function LocationPicker({
  locale,
  alcaldias,
  partnerLocations,
  selectedAlcaldiaId,
  refinementMode,
  selectedPartnerLocationId,
  streetReference,
  onChangeAlcaldia,
  onChangeRefinementMode,
  onChangePartnerLocation,
  onChangeStreetReference,
  errors,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const copy = t.compose.location
  const [alcaldiaQuery, setAlcaldiaQuery] = useState('')
  const [partnerQuery, setPartnerQuery] = useState('')
  const alcaldiaInputId = useId()
  const alcaldiaListId = useId()
  const partnerInputId = useId()
  const partnerListId = useId()
  const streetInputId = useId()

  const selectedAlcaldia = useMemo(
    () => alcaldias.find((a) => a.id === selectedAlcaldiaId) ?? null,
    [alcaldias, selectedAlcaldiaId]
  )

  const filteredAlcaldias = useMemo(() => {
    const norm = alcaldiaQuery.trim().toLowerCase()
    if (!norm) return alcaldias
    return alcaldias.filter((loc) =>
      `${loc.name}`.toLowerCase().includes(norm)
    )
  }, [alcaldias, alcaldiaQuery])

  // Best-effort filter of partner locations to the chosen alcaldía. We
  // text-match the alcaldía's name against the partner row's neighborhood
  // OR city. If nothing matches we still show the full list rather than
  // hiding every option — better to surface them than to leave the user
  // staring at "no results" because the data isn't tagged yet.
  const partnersInAlcaldia = useMemo(() => {
    if (!selectedAlcaldia) return []
    const needle = selectedAlcaldia.name.toLowerCase()
    const inAlcaldia = partnerLocations.filter((loc) => {
      const hay = `${loc.neighborhood ?? ''} ${loc.city ?? ''}`.toLowerCase()
      return hay.includes(needle)
    })
    return inAlcaldia
  }, [partnerLocations, selectedAlcaldia])

  const filteredPartners = useMemo(() => {
    const list = partnersInAlcaldia
    const norm = partnerQuery.trim().toLowerCase()
    if (!norm) return list.slice(0, 80)
    return list
      .filter((loc) => {
        const haystack =
          `${loc.name} ${loc.neighborhood ?? ''}`.toLowerCase()
        return haystack.includes(norm)
      })
      .slice(0, 80)
  }, [partnersInAlcaldia, partnerQuery])

  // ---------------------------------------------------------------------------
  // Stage A — Alcaldía picker
  // ---------------------------------------------------------------------------
  if (!selectedAlcaldia) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {copy.stageA.heading}
          </h3>
          <p className="mt-1 text-xs text-slate-400">{copy.stageA.subtitle}</p>
        </div>

        <div>
          <label htmlFor={alcaldiaInputId} className="sr-only">
            {copy.stageA.searchPlaceholder}
          </label>
          <input
            id={alcaldiaInputId}
            type="search"
            value={alcaldiaQuery}
            onChange={(e) => setAlcaldiaQuery(e.target.value)}
            placeholder={copy.stageA.searchPlaceholder}
            autoComplete="off"
            aria-controls={alcaldiaListId}
            className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <ul
          id={alcaldiaListId}
          role="listbox"
          aria-label={copy.stageA.heading}
          aria-invalid={errors?.alcaldia ? true : undefined}
          className="grid max-h-80 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-[#2d3748] bg-[#0f1419] p-1 sm:grid-cols-2"
        >
          {filteredAlcaldias.length === 0 ? (
            <li className="col-span-full px-3 py-4 text-center text-xs text-slate-500">
              {copy.stageA.empty}
            </li>
          ) : (
            filteredAlcaldias.map((loc) => {
              const isSelected = loc.id === selectedAlcaldiaId
              return (
                <li key={loc.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => onChangeAlcaldia(loc.id)}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-100'
                        : 'text-slate-200 hover:bg-[#1a212d]'
                    }`}
                  >
                    <span className="font-medium">{loc.name}</span>
                    <span className="text-xs text-slate-400">
                      {copy.stageA.cdmxSubtitle}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>

        {errors?.alcaldia && (
          <p role="alert" className="text-xs text-rose-300">
            {errors.alcaldia}
          </p>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Stage A confirmation chip + Stage B refinement
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true">📍</span>
          <span className="font-semibold">{selectedAlcaldia.name}</span>
        </span>
        <button
          type="button"
          onClick={() => onChangeAlcaldia('')}
          className="text-xs font-semibold text-emerald-200 underline hover:text-emerald-100"
        >
          {copy.stageA.changeCta}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {copy.stageB.heading}
            </h3>
            <p className="mt-1 text-xs text-slate-400">{copy.stageB.subtitle}</p>
          </div>
          {refinementMode !== 'none' && (
            <button
              type="button"
              onClick={() => onChangeRefinementMode('none')}
              className="text-xs font-semibold text-emerald-300 underline hover:text-emerald-200"
            >
              {copy.stageB.skipCta}
            </button>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label={copy.stageB.heading}
          className="grid gap-2 sm:grid-cols-3"
        >
          {(['partner', 'street', 'none'] as const).map((mode) => {
            const active = refinementMode === mode
            const label = copy.stageB.modes[mode].label
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChangeRefinementMode(mode)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  active
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100'
                    : 'border-[#2d3748] text-slate-300 hover:border-emerald-400/60'
                }`}
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {copy.stageB.modes[mode].help}
                </span>
              </button>
            )
          })}
        </div>

        {refinementMode === 'partner' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              {copy.stageB.modes.partner.help}
            </p>
            <label htmlFor={partnerInputId} className="sr-only">
              {copy.stageB.modes.partner.searchPlaceholder}
            </label>
            <input
              id={partnerInputId}
              type="search"
              value={partnerQuery}
              onChange={(e) => setPartnerQuery(e.target.value)}
              placeholder={copy.stageB.modes.partner.searchPlaceholder}
              autoComplete="off"
              aria-controls={partnerListId}
              className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <ul
              id={partnerListId}
              role="listbox"
              aria-label={copy.stageB.modes.partner.label}
              aria-invalid={errors?.partner ? true : undefined}
              className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[#2d3748] bg-[#0f1419] p-1"
            >
              {filteredPartners.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-slate-500">
                  {copy.stageB.modes.partner.empty}
                </li>
              ) : (
                filteredPartners.map((loc) => {
                  const isSelected = loc.id === selectedPartnerLocationId
                  return (
                    <li
                      key={loc.id}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <button
                        type="button"
                        onClick={() => onChangePartnerLocation(loc.id)}
                        className={`flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/15 text-emerald-100'
                            : 'text-slate-200 hover:bg-[#1a212d]'
                        }`}
                      >
                        <span className="font-medium">{loc.name}</span>
                        {loc.neighborhood && (
                          <span className="text-xs text-slate-400">
                            {loc.neighborhood}
                            {loc.city ? ` · ${loc.city}` : ''}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
            {errors?.partner && (
              <p role="alert" className="text-xs text-rose-300">
                {errors.partner}
              </p>
            )}
          </div>
        )}

        {refinementMode === 'street' && (
          <div className="space-y-2">
            <label
              htmlFor={streetInputId}
              className="block text-xs font-semibold text-slate-300"
            >
              {copy.stageB.modes.street.label}
            </label>
            <input
              id={streetInputId}
              type="text"
              value={streetReference}
              onChange={(e) => onChangeStreetReference(e.target.value)}
              placeholder={copy.stageB.modes.street.placeholder}
              maxLength={160}
              aria-invalid={errors?.street ? true : undefined}
              className={`w-full rounded-lg border bg-[#0f1419] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none ${
                errors?.street
                  ? 'border-rose-400'
                  : 'border-[#2d3748] focus:border-emerald-400'
              }`}
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{copy.stageB.modes.street.hint}</span>
              <span>{streetReference.trim().length}/160</span>
            </div>
            {errors?.street && (
              <p role="alert" className="text-xs text-rose-300">
                {errors.street}
              </p>
            )}
          </div>
        )}

        {refinementMode === 'none' && (
          <p className="rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-xs text-slate-400">
            {copy.stageB.modes.none.help}
          </p>
        )}
      </div>
    </div>
  )
}
