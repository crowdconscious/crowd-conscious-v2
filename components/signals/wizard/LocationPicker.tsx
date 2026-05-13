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

type Props = {
  locale: CitizenSignalsLocale
  locations: ReadonlyArray<LocationOption>
  selectedId: string
  onChange: (id: string) => void
  error?: string
}

/**
 * Searchable list of CDMX `conscious_locations`. Accepts the entire pilot
 * subset and lets the user filter by name or neighborhood. We match on
 * both fields so "Roma" finds locations whose neighborhood is "Roma Norte".
 */
export default function LocationPicker({
  locale,
  locations,
  selectedId,
  onChange,
  error,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const [query, setQuery] = useState('')
  const inputId = useId()
  const listId = useId()

  const filtered = useMemo(() => {
    const norm = query.trim().toLowerCase()
    if (!norm) return locations.slice(0, 80)
    return locations
      .filter((loc) => {
        const haystack = `${loc.name} ${loc.neighborhood ?? ''}`.toLowerCase()
        return haystack.includes(norm)
      })
      .slice(0, 80)
  }, [locations, query])

  return (
    <div className="space-y-3">
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
        aria-label={t.detail.location}
        aria-invalid={error ? true : undefined}
        className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-[#2d3748] bg-[#0f1419] p-1"
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-center text-xs text-slate-500">
            {t.compose.wizard.noResults}
          </li>
        ) : (
          filtered.map((loc) => {
            const isSelected = loc.id === selectedId
            return (
              <li key={loc.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => onChange(loc.id)}
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

      {error && (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
}
