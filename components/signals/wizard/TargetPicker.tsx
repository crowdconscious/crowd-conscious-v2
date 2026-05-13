'use client'

import { useId, useMemo, useState } from 'react'
import {
  getCitizenSignalsCopy,
  SIGNAL_TARGET_KINDS,
  type CitizenSignalsLocale,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'

export type TargetOption = {
  id: string
  slug: string
  display_name: string
  target_kind: string
}

type Props = {
  locale: CitizenSignalsLocale
  targets: ReadonlyArray<TargetOption>
  selectedId: string
  selectedKind: SignalTargetKind
  onChange: (next: { id: string; kind: SignalTargetKind }) => void
  error?: string
}

/**
 * Searchable target picker. The kind toggle (alcaldía / institución) acts
 * as a coarse filter; the search input narrows further by display_name.
 *
 * Renders as a native button list rather than a `<select>` so we can show
 * the kind badge inline on each option and keep keyboard nav.
 */
export default function TargetPicker({
  locale,
  targets,
  selectedId,
  selectedKind,
  onChange,
  error,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const [query, setQuery] = useState('')
  const inputId = useId()
  const listId = useId()

  const filtered = useMemo(() => {
    const norm = query.trim().toLowerCase()
    return targets
      .filter((target) => target.target_kind === selectedKind)
      .filter((target) =>
        norm ? target.display_name.toLowerCase().includes(norm) : true
      )
      .slice(0, 50)
  }, [targets, selectedKind, query])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.feed.filters.target}>
        {SIGNAL_TARGET_KINDS.map((kind) => {
          const active = kind === selectedKind
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ id: '', kind })}
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

      <div>
        <label htmlFor={inputId} className="sr-only">
          {t.compose.wizard.searchPlaceholder}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.compose.wizard.searchPlaceholder}
          className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          aria-controls={listId}
          autoComplete="off"
        />
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={t.detail.target}
        aria-invalid={error ? true : undefined}
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

      {error && (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
}
