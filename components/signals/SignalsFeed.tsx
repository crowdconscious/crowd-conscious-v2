'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  getCitizenSignalsCopy,
  SIGNAL_CATEGORIES,
  SIGNAL_SEVERITIES,
  SIGNAL_TARGET_KINDS,
  type CitizenSignalsLocale,
  type SignalCategory,
  type SignalSeverity,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'
import SignalCard, { type SignalCardData } from './SignalCard'

type Props = {
  locale: CitizenSignalsLocale
  initialSignals: SignalCardData[]
  initialNextCursor: string | null
}

type Filters = {
  category: SignalCategory | null
  severity: SignalSeverity | null
  targetKind: SignalTargetKind | null
  stage: number | null
}

const DEFAULT_FILTERS: Filters = {
  category: null,
  severity: null,
  targetKind: null,
  stage: null,
}

export default function SignalsFeed({
  locale,
  initialSignals,
  initialNextCursor,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const [signals, setSignals] = useState<SignalCardData[]>(initialSignals)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [loadingMore, startMore] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  // Refetch from the API whenever filters change. We start over from the
  // first page; we don't try to filter the SSR'd list in place because
  // pagination cursors would lose meaning.
  useEffect(() => {
    const allDefault =
      filters.category === DEFAULT_FILTERS.category &&
      filters.severity === DEFAULT_FILTERS.severity &&
      filters.targetKind === DEFAULT_FILTERS.targetKind &&
      filters.stage === DEFAULT_FILTERS.stage
    if (allDefault) {
      setSignals(initialSignals)
      setNextCursor(initialNextCursor)
      return
    }
    const abort = new AbortController()
    setFetching(true)
    setError(null)
    void (async () => {
      try {
        const params = new URLSearchParams()
        if (filters.category) params.set('category', filters.category)
        if (filters.severity) params.set('severity', filters.severity)
        if (filters.targetKind) params.set('target_kind', filters.targetKind)
        if (filters.stage !== null) params.set('stage', String(filters.stage))
        const res = await fetch(`/api/signals?${params.toString()}`, {
          signal: abort.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as {
          signals: SignalCardData[]
          nextCursor: string | null
        }
        setSignals(json.signals)
        setNextCursor(json.nextCursor)
      } catch (e: unknown) {
        if ((e as { name?: string }).name === 'AbortError') return
        setError((e as Error).message ?? 'Error')
      } finally {
        setFetching(false)
      }
    })()
    return () => abort.abort()
  }, [filters, initialSignals, initialNextCursor])

  const loadMore = () => {
    if (!nextCursor || loadingMore) return
    startMore(async () => {
      try {
        const params = new URLSearchParams()
        if (filters.category) params.set('category', filters.category)
        if (filters.severity) params.set('severity', filters.severity)
        if (filters.targetKind) params.set('target_kind', filters.targetKind)
        if (filters.stage !== null) params.set('stage', String(filters.stage))
        params.set('cursor', nextCursor)
        const res = await fetch(`/api/signals?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as {
          signals: SignalCardData[]
          nextCursor: string | null
        }
        setSignals((prev) => [...prev, ...json.signals])
        setNextCursor(json.nextCursor)
      } catch (e: unknown) {
        setError((e as Error).message ?? 'Error')
      }
    })
  }

  const showEmpty = !fetching && signals.length === 0

  const categoryOptions = useMemo(
    () =>
      SIGNAL_CATEGORIES.map((c) => ({
        value: c,
        label: t.categoryLabel(c),
      })),
    [t]
  )
  const severityOptions = useMemo(
    () =>
      SIGNAL_SEVERITIES.map((s) => ({
        value: s,
        label: t.severityLabel(s),
      })),
    [t]
  )
  const targetKindOptions = useMemo(
    () =>
      SIGNAL_TARGET_KINDS.map((tk) => ({
        value: tk,
        label: t.targetKindLabel(tk),
      })),
    [t]
  )

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <FilterSelect
          label={t.feed.filters.category}
          value={filters.category}
          options={categoryOptions}
          onChange={(v) =>
            setFilters((f) => ({ ...f, category: v as SignalCategory | null }))
          }
        />
        <FilterSelect
          label={t.feed.filters.severity}
          value={filters.severity}
          options={severityOptions}
          onChange={(v) =>
            setFilters((f) => ({ ...f, severity: v as SignalSeverity | null }))
          }
        />
        <FilterSelect
          label={t.feed.filters.target}
          value={filters.targetKind}
          options={targetKindOptions}
          onChange={(v) =>
            setFilters((f) => ({ ...f, targetKind: v as SignalTargetKind | null }))
          }
        />
        <FilterSelect
          label={t.feed.filters.stage}
          value={filters.stage === null ? null : String(filters.stage)}
          options={[
            { value: '0', label: locale === 'es' ? 'Etapa 0' : 'Stage 0' },
            { value: '1', label: locale === 'es' ? 'Etapa 1' : 'Stage 1' },
            { value: '2', label: locale === 'es' ? 'Etapa 2' : 'Stage 2' },
          ]}
          onChange={(v) =>
            setFilters((f) => ({ ...f, stage: v === null ? null : Number(v) }))
          }
        />
        {(filters.category ||
          filters.severity ||
          filters.targetKind ||
          filters.stage !== null) && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-slate-400 underline hover:text-emerald-300"
          >
            {locale === 'es' ? 'Limpiar filtros' : 'Clear filters'}
          </button>
        )}
        {fetching && (
          <span className="text-xs text-slate-500">
            {locale === 'es' ? 'Cargando…' : 'Loading…'}
          </span>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {showEmpty ? (
        <div className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-10 text-center">
          <h2 className="text-lg font-semibold text-white">{t.feed.empty.title}</h2>
          <p className="mt-2 text-sm text-slate-400">{t.feed.empty.subtitle}</p>
          <a
            href="/signals/nueva"
            className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
          >
            {t.feed.empty.cta}
          </a>
        </div>
      ) : (
        <ul className="grid gap-4">
          {signals.map((s) => (
            <li key={s.id}>
              <SignalCard locale={locale} signal={s} />
            </li>
          ))}
        </ul>
      )}

      {nextCursor && !showEmpty && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[#2d3748] px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-emerald-400 hover:text-white disabled:opacity-60"
          >
            {loadingMore
              ? locale === 'es'
                ? 'Cargando…'
                : 'Loading…'
              : locale === 'es'
                ? 'Cargar más'
                : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: { value: string; label: string }[]
  onChange: (v: string | null) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-[#2d3748] bg-[#11161f] px-3 py-2 text-xs text-slate-300">
      <span className="font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="bg-transparent text-slate-100 focus:outline-none"
      >
        <option value="" className="bg-[#11161f] text-slate-300">
          —
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#11161f] text-slate-100">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
