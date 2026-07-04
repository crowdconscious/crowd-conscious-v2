'use client'

import { useId, useMemo, useState } from 'react'
import {
  getCitizenSignalsCopy,
  SIGNAL_TARGET_KINDS,
  isRegistryTargetKind,
  type CitizenSignalsLocale,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'

export type TargetOption = {
  id: string
  slug: string
  display_name: string
  target_kind: string
}

/** Active conscious_locations offered as direct targets (migration 248). */
export type TargetLocationOption = {
  id: string
  name: string
  neighborhood: string | null
  city: string | null
}

export type TargetDraftPatch = Partial<{
  kind: SignalTargetKind
  id: string
  targetName: string
  targetContactEmail: string
  targetLocationId: string
}>

type Props = {
  locale: CitizenSignalsLocale
  targets: ReadonlyArray<TargetOption>
  /** Active conscious_locations for the "Lugar Consciente" kind. */
  targetLocations: ReadonlyArray<TargetLocationOption>
  selectedId: string
  selectedKind: SignalTargetKind
  targetName: string
  targetContactEmail: string
  targetLocationId: string
  onChange: (patch: TargetDraftPatch) => void
  errors?: {
    targetId?: string
    targetName?: string
    targetContactEmail?: string
    targetLocationId?: string
  }
}

/**
 * Target picker for the compose wizard.
 *
 * The kind chips act as a mode switch:
 *  - municipality / institution — searchable registry list (citizen_targets)
 *  - company — free-text name + optional contact email
 *  - neighborhood — free-text colonia name
 *  - conscious_location — searchable list of active conscious_locations
 */
export default function TargetPicker({
  locale,
  targets,
  targetLocations,
  selectedId,
  selectedKind,
  targetName,
  targetContactEmail,
  targetLocationId,
  onChange,
  errors,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const [query, setQuery] = useState('')
  const inputId = useId()
  const listId = useId()

  const isRegistry = isRegistryTargetKind(selectedKind)

  const filtered = useMemo(() => {
    const norm = query.trim().toLowerCase()
    return targets
      .filter((target) => target.target_kind === selectedKind)
      .filter((target) =>
        norm ? target.display_name.toLowerCase().includes(norm) : true
      )
      .slice(0, 50)
  }, [targets, selectedKind, query])

  const filteredLocations = useMemo(() => {
    const norm = query.trim().toLowerCase()
    return targetLocations
      .filter((loc) =>
        norm
          ? loc.name.toLowerCase().includes(norm) ||
            (loc.neighborhood ?? '').toLowerCase().includes(norm)
          : true
      )
      .slice(0, 50)
  }, [targetLocations, query])

  const switchKind = (kind: SignalTargetKind) => {
    setQuery('')
    onChange({
      kind,
      id: '',
      targetName: '',
      targetContactEmail: '',
      targetLocationId: '',
    })
  }

  const kindCopy = t.compose.targetKinds

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={t.feed.filters.target}
      >
        {SIGNAL_TARGET_KINDS.map((kind) => {
          const active = kind === selectedKind
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => switchKind(kind)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                  : 'border-[#2d3748] text-slate-400 hover:border-emerald-400/60'
              }`}
            >
              {t.targetKindLabel(kind)}
            </button>
          )
        })}
      </div>

      {(isRegistry || selectedKind === 'conscious_location') && (
        <div>
          <label htmlFor={inputId} className="sr-only">
            {selectedKind === 'conscious_location'
              ? kindCopy.consciousLocation.searchPlaceholder
              : t.compose.wizard.searchPlaceholder}
          </label>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              selectedKind === 'conscious_location'
                ? kindCopy.consciousLocation.searchPlaceholder
                : t.compose.wizard.searchPlaceholder
            }
            className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            aria-controls={listId}
            autoComplete="off"
          />
        </div>
      )}

      {isRegistry && (
        <>
          <ul
            id={listId}
            role="listbox"
            aria-label={t.detail.target}
            aria-invalid={errors?.targetId ? true : undefined}
            className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[#2d3748] bg-[#0f1419] p-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-500">
                {t.compose.wizard.noResults}
              </li>
            ) : (
              filtered.map((target) => {
                const isSelected = target.id === selectedId
                return (
                  <li key={target.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ id: target.id, kind: selectedKind })
                      }
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-100'
                          : 'text-slate-200 hover:bg-[#1a212d]'
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {target.display_name}
                      </span>
                      <span className="shrink-0 rounded-full border border-[#2d3748] bg-[#11161f] px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                        {t.targetKindLabel(
                          target.target_kind as SignalTargetKind
                        )}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          {errors?.targetId && (
            <p role="alert" className="text-xs text-rose-300">
              {errors.targetId}
            </p>
          )}
        </>
      )}

      {selectedKind === 'company' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="target-company-name"
              className="block text-sm font-semibold text-white"
            >
              {kindCopy.company.nameLabel}
            </label>
            <input
              id="target-company-name"
              type="text"
              maxLength={160}
              value={targetName}
              onChange={(e) => onChange({ targetName: e.target.value })}
              placeholder={kindCopy.company.namePlaceholder}
              aria-invalid={errors?.targetName ? true : undefined}
              className={`mt-2 w-full rounded-lg border bg-[#0f1419] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none ${
                errors?.targetName
                  ? 'border-rose-400'
                  : 'border-[#2d3748] focus:border-emerald-400'
              }`}
            />
            {errors?.targetName && (
              <p role="alert" className="mt-1 text-xs text-rose-300">
                {errors.targetName}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="target-company-email"
              className="block text-sm font-semibold text-white"
            >
              {kindCopy.company.emailLabel}
            </label>
            <input
              id="target-company-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              maxLength={320}
              value={targetContactEmail}
              onChange={(e) =>
                onChange({ targetContactEmail: e.target.value })
              }
              placeholder={kindCopy.company.emailPlaceholder}
              aria-invalid={errors?.targetContactEmail ? true : undefined}
              className={`mt-2 w-full rounded-lg border bg-[#0f1419] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none ${
                errors?.targetContactEmail
                  ? 'border-rose-400'
                  : 'border-[#2d3748] focus:border-emerald-400'
              }`}
            />
            <p className="mt-1 text-xs text-slate-500">
              {kindCopy.company.emailHelp}
            </p>
            {errors?.targetContactEmail && (
              <p role="alert" className="mt-1 text-xs text-rose-300">
                {errors.targetContactEmail}
              </p>
            )}
          </div>
        </div>
      )}

      {selectedKind === 'neighborhood' && (
        <div>
          <label
            htmlFor="target-neighborhood-name"
            className="block text-sm font-semibold text-white"
          >
            {kindCopy.neighborhood.nameLabel}
          </label>
          <input
            id="target-neighborhood-name"
            type="text"
            maxLength={160}
            value={targetName}
            onChange={(e) => onChange({ targetName: e.target.value })}
            placeholder={kindCopy.neighborhood.namePlaceholder}
            aria-invalid={errors?.targetName ? true : undefined}
            className={`mt-2 w-full rounded-lg border bg-[#0f1419] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none ${
              errors?.targetName
                ? 'border-rose-400'
                : 'border-[#2d3748] focus:border-emerald-400'
            }`}
          />
          <p className="mt-1 text-xs text-slate-500">
            {kindCopy.neighborhood.help}
          </p>
          {errors?.targetName && (
            <p role="alert" className="mt-1 text-xs text-rose-300">
              {errors.targetName}
            </p>
          )}
        </div>
      )}

      {selectedKind === 'conscious_location' && (
        <>
          <p className="text-xs text-slate-500">
            {kindCopy.consciousLocation.help}
          </p>
          <ul
            id={listId}
            role="listbox"
            aria-label={kindCopy.consciousLocation.pickerLabel}
            aria-invalid={errors?.targetLocationId ? true : undefined}
            className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[#2d3748] bg-[#0f1419] p-1"
          >
            {filteredLocations.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-500">
                {kindCopy.consciousLocation.empty}
              </li>
            ) : (
              filteredLocations.map((loc) => {
                const isSelected = loc.id === targetLocationId
                const subline = [loc.neighborhood, loc.city]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <li key={loc.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          targetLocationId: loc.id,
                          targetName: loc.name,
                        })
                      }
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-100'
                          : 'text-slate-200 hover:bg-[#1a212d]'
                      }`}
                    >
                      <span className="min-w-0 truncate">{loc.name}</span>
                      {subline && (
                        <span className="shrink-0 truncate text-[10px] text-slate-500">
                          {subline}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          {errors?.targetLocationId && (
            <p role="alert" className="text-xs text-rose-300">
              {errors.targetLocationId}
            </p>
          )}
        </>
      )}
    </div>
  )
}
