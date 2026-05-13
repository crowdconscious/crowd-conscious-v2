'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import type { SignalListItem, SignalLookups } from '@/lib/signals/list'
import SignalCard from './SignalCard'
import SignalsFilters, {
  DEFAULT_FILTERS,
  type SignalsFilterState,
} from './SignalsFilters'

type Props = {
  locale: CitizenSignalsLocale
  initialSignals: SignalListItem[]
  initialLookups: SignalLookups
  initialNextCursor: string | null
  stage1Threshold: number
}

type ApiSignalRow = {
  id: string
  public_slug: string
  post_type: string
  category: string
  severity: string
  target_kind: string
  citizen_target_id: string
  title: string
  body: string
  language: string
  conscious_location_id: string
  anonymous_display_mode: boolean
  display_name: string | null
  threshold_stage: number
  cosign_count: number
  anonymous_support_count: number
  stage1_met_at: string | null
  stage2_met_at: string | null
  created_at: string
  updated_at: string
}

type ApiResponse = {
  signals: ApiSignalRow[]
  nextCursor: string | null
}

export default function SignalsFeed({
  locale,
  initialSignals,
  initialLookups,
  initialNextCursor,
  stage1Threshold,
}: Props) {
  const t = getCitizenSignalsCopy(locale)

  const [signals, setSignals] = useState<SignalListItem[]>(initialSignals)
  const [lookups] = useState<SignalLookups>(initialLookups)
  const [cursor, setCursor] = useState<string | null>(initialNextCursor)
  const [filters, setFilters] = useState<SignalsFilterState>(DEFAULT_FILTERS)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const visible = useMemo(() => {
    const filtered = signals.filter((s) => {
      if (filters.category !== 'all' && s.category !== filters.category) return false
      if (filters.severity !== 'all' && s.severity !== filters.severity) return false
      if (filters.targetKind !== 'all' && s.targetKind !== filters.targetKind)
        return false
      return true
    })
    if (filters.sort === 'cosigns') {
      return [...filtered].sort((a, b) => {
        if (b.cosignCount !== a.cosignCount) return b.cosignCount - a.cosignCount
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    }
    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [signals, filters])

  async function handleLoadMore() {
    if (!cursor) return
    setLoadError(null)
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ cursor, limit: '20' })
        const res = await fetch(`/api/signals?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          setLoadError(t.feed.loadMoreError)
          return
        }
        const json = (await res.json()) as ApiResponse
        const newRows = (json.signals ?? []).map((r) =>
          mapApiRow(r, lookups)
        )
        setSignals((prev) => mergeUnique(prev, newRows))
        setCursor(json.nextCursor ?? null)
      } catch (err) {
        console.error('[SignalsFeed] load more', err)
        setLoadError(t.feed.loadMoreError)
      }
    })
  }

  return (
    <div>
      <SignalsFilters locale={locale} value={filters} onChange={setFilters} />

      {visible.length === 0 ? (
        <EmptyState locale={locale} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((s) => (
            <li key={s.id}>
              <SignalCard
                signal={s}
                locale={locale}
                stage1Threshold={stage1Threshold}
              />
            </li>
          ))}
        </ul>
      )}

      {cursor && visible.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#2d3748] bg-[#1a2029] px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-emerald-500/50 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t.feed.loading : t.feed.loadMore}
          </button>
        </div>
      )}

      {loadError && (
        <p className="mt-4 text-center text-sm text-rose-400">{loadError}</p>
      )}

      <p className="mt-12 text-center text-xs text-slate-500">
        {t.feed.betaBanner}
      </p>
    </div>
  )
}

function EmptyState({ locale }: { locale: CitizenSignalsLocale }) {
  const t = getCitizenSignalsCopy(locale)
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-[#1a2029] px-6 py-16 text-center">
      <p className="text-lg font-semibold text-slate-200">{t.feed.empty.title}</p>
      <p className="mt-2 text-sm text-slate-500">{t.feed.empty.subtitle}</p>
      <Link
        href="/signals/nueva"
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
      >
        {t.feed.empty.cta}
      </Link>
    </div>
  )
}

function mergeUnique(
  prev: SignalListItem[],
  next: SignalListItem[]
): SignalListItem[] {
  const seen = new Set(prev.map((s) => s.id))
  const additions = next.filter((s) => !seen.has(s.id))
  return [...prev, ...additions]
}

function mapApiRow(row: ApiSignalRow, lookups: SignalLookups): SignalListItem {
  return {
    id: row.id,
    publicSlug: row.public_slug,
    postType: row.post_type,
    category: row.category as SignalListItem['category'],
    severity: row.severity as SignalListItem['severity'],
    targetKind: row.target_kind as SignalListItem['targetKind'],
    citizenTargetId: row.citizen_target_id,
    title: row.title,
    body: row.body,
    language: row.language,
    consciousLocationId: row.conscious_location_id,
    displayName: row.display_name,
    anonymousDisplayMode: row.anonymous_display_mode,
    thresholdStage: row.threshold_stage,
    cosignCount: row.cosign_count,
    anonymousSupportCount: row.anonymous_support_count,
    stage1MetAt: row.stage1_met_at,
    stage2MetAt: row.stage2_met_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    targetName: lookups.targets[row.citizen_target_id]?.displayName ?? null,
    locationName: lookups.locations[row.conscious_location_id]?.name ?? null,
  }
}
