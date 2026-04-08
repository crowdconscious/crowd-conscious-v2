'use client'

import { useEffect, useState, useMemo } from 'react'
import PulseEmbed, { type PulseEmbedData } from '@/components/blog/PulseEmbed'
import type { PulseOutcomeRow, PulseVoteRow } from '@/components/pulse/PulseResultClient'
import {
  DEFAULT_PULSE_EMBED_COMPONENTS,
  PULSE_EMBED_COMPONENT_KEYS,
  type PulseEmbedComponentKey,
  type PulseEmbedPosition,
} from '@/lib/pulse-embed-constants'

const POSITION_OPTIONS: { id: PulseEmbedPosition; label: string }[] = [
  { id: 'after_intro', label: 'After introduction (after first ## heading)' },
  { id: 'before_cta', label: 'Before CTA (before last ## heading)' },
  { id: 'full_section', label: 'Full data section (dedicated section)' },
]

const COMPONENT_LABELS: Record<PulseEmbedComponentKey, string> = {
  results_bars: 'Results bars (vote percentages per outcome)',
  executive_summary: 'Executive summary (auto-generated text)',
  key_insights: 'Key insights',
  confidence_chart: 'Confidence distribution chart',
  vote_timeline: 'Vote activity timeline',
  vote_metrics: 'Total votes + average confidence metrics',
}

type PulseListRow = {
  id: string
  title: string
  status: string
  total_votes: number | null
  engagement_count: number | null
}

function statusLabel(status: string): 'active' | 'closed' {
  if (['resolved', 'cancelled', 'disputed'].includes(status)) return 'closed'
  return 'active'
}

type Props = {
  localePreview?: 'es' | 'en'
  embedEnabled: boolean
  onEmbedEnabledChange: (v: boolean) => void
  pulseMarketId: string | null
  onPulseMarketIdChange: (id: string | null) => void
  pulseEmbedPosition: PulseEmbedPosition
  onPulseEmbedPositionChange: (p: PulseEmbedPosition) => void
  selectedComponents: PulseEmbedComponentKey[]
  onToggleComponent: (k: PulseEmbedComponentKey, checked: boolean) => void
}

export default function BlogPulseEmbedFields({
  localePreview = 'es',
  embedEnabled,
  onEmbedEnabledChange,
  pulseMarketId,
  onPulseMarketIdChange,
  pulseEmbedPosition,
  onPulseEmbedPositionChange,
  selectedComponents,
  onToggleComponent,
}: Props) {
  const [markets, setMarkets] = useState<PulseListRow[]>([])
  const [listError, setListError] = useState('')
  const [previewData, setPreviewData] = useState<PulseEmbedData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setListError('')
      try {
        const res = await fetch('/api/predictions/admin/pulse-markets')
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? res.statusText)
        if (!cancelled) setMarkets((json.markets ?? []) as PulseListRow[])
      } catch (e) {
        if (!cancelled) setListError(e instanceof Error ? e.message : 'Failed to load Pulse markets')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!embedEnabled || !pulseMarketId) {
      setPreviewData(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setPreviewLoading(true)
      try {
        const res = await fetch(`/api/predictions/admin/pulse-markets/${pulseMarketId}`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? res.statusText)
        const m = json.market
        if (!m || cancelled) return
        const votes = (m.market_votes ?? []) as PulseVoteRow[]
        const outcomes = (m.market_outcomes ?? []) as PulseOutcomeRow[]
        setPreviewData({
          marketId: m.id,
          title: m.title,
          description: m.description,
          translations: m.translations,
          status: m.status,
          resolutionDate: m.resolution_date,
          outcomes,
          votes,
        })
      } catch {
        if (!cancelled) setPreviewData(null)
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [embedEnabled, pulseMarketId])

  const previewComponents = useMemo(() => {
    const set = new Set(selectedComponents)
    return DEFAULT_PULSE_EMBED_COMPONENTS.filter((k) => set.has(k))
  }, [selectedComponents])

  const input =
    'w-full px-4 py-2.5 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50'

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#0f1419]/80 p-5">
      <h2 className="text-lg font-semibold text-white">Pulse Data Embed</h2>
      <p className="mt-1 text-sm text-slate-500">
        Embed live Conscious Pulse results inside this article (same charts as the Pulse results page).
      </p>

      {listError ? (
        <p className="mt-2 text-sm text-amber-500/90">{listError}</p>
      ) : null}

      <label className="mt-4 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-[#2d3748] bg-[#1a2029] text-emerald-500 focus:ring-emerald-500/40"
          checked={embedEnabled}
          onChange={(e) => {
            onEmbedEnabledChange(e.target.checked)
            if (!e.target.checked) onPulseMarketIdChange(null)
          }}
        />
        <span className="text-sm text-slate-300">Embed Pulse data in this post</span>
      </label>

      {embedEnabled ? (
        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Select Pulse market</label>
            <select
              className={input}
              value={pulseMarketId ?? ''}
              onChange={(e) => onPulseMarketIdChange(e.target.value || null)}
            >
              <option value="">— Choose a Pulse —</option>
              {markets.map((m) => {
                const votes = m.total_votes ?? m.engagement_count ?? 0
                const st = statusLabel(m.status)
                return (
                  <option key={m.id} value={m.id}>
                    {m.title} · {votes} votes · {st}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Embed position</label>
            <select
              className={input}
              value={pulseEmbedPosition}
              onChange={(e) => onPulseEmbedPositionChange(e.target.value as PulseEmbedPosition)}
            >
              {POSITION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-2 block text-sm text-slate-400">Include visualizations</span>
            <div className="space-y-2">
              {PULSE_EMBED_COMPONENT_KEYS.map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#2d3748] bg-[#1a2029] text-emerald-500 focus:ring-emerald-500/40"
                    checked={selectedComponents.includes(key)}
                    onChange={(e) => onToggleComponent(key, e.target.checked)}
                  />
                  <span className="text-sm text-slate-300">{COMPONENT_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          {pulseMarketId ? (
            <div className="border-t border-[#2d3748] pt-6">
              <p className="mb-3 text-sm font-medium text-slate-300">Preview</p>
              {previewLoading ? (
                <p className="text-sm text-slate-500">Loading Pulse data…</p>
              ) : previewData ? (
                <div className="max-h-[560px] overflow-y-auto rounded-lg border border-[#2d3748] bg-[#0f1419] p-2">
                  <PulseEmbed
                    data={previewData}
                    locale={localePreview}
                    components={previewComponents}
                    showOwnHeading={pulseEmbedPosition === 'full_section'}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-500">Could not load preview.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
