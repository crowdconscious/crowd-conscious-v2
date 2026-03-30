'use client'

import { useMemo } from 'react'

type VoteLike = { created_at: string }

export default function VoteTimeline({ votes }: { votes: VoteLike[] }) {
  const { buckets, labels, peakLabel } = useMemo(() => {
    if (votes.length === 0) {
      return { buckets: [] as number[], labels: [] as string[], peakLabel: '—' }
    }
    const times = votes.map((v) => new Date(v.created_at).getTime())
    const spanMs = Math.max(...times) - Math.min(...times)
    const threeDays = 3 * 24 * 60 * 60 * 1000
    const byHour = spanMs > 0 && spanMs < threeDays

    const map = new Map<string, number>()
    const order: string[] = []

    for (const v of votes) {
      const d = new Date(v.created_at)
      const key = byHour
        ? `${d.toISOString().slice(0, 13)}:00`
        : d.toISOString().slice(0, 10)
      if (!map.has(key)) {
        map.set(key, 0)
        order.push(key)
      }
      map.set(key, (map.get(key) ?? 0) + 1)
    }

    order.sort()
    const buckets = order.map((k) => map.get(k) ?? 0)
    const labels = order.map((k) => {
      const d = new Date(byHour ? k : k + 'T12:00:00Z')
      return byHour
        ? d.toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit' })
        : d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
    })

    let peakIdx = 0
    for (let i = 1; i < buckets.length; i++) {
      if (buckets[i] > buckets[peakIdx]) peakIdx = i
    }
    const peakLabel =
      order.length > 0
        ? new Date(byHour ? order[peakIdx] : order[peakIdx] + 'T12:00:00Z').toLocaleString(
            'es-MX',
            { dateStyle: 'medium', timeStyle: byHour ? 'short' : undefined }
          )
        : '—'

    return { buckets, labels, peakLabel }
  }, [votes])

  const maxB = Math.max(...buckets, 1)

  if (votes.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="mb-2 text-sm font-semibold text-white">Actividad de votación</h3>
        <p className="text-sm text-slate-500">Aún no hay suficientes datos.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Actividad de votación</h3>
      <div className="flex h-32 items-end gap-1 overflow-x-auto pb-1">
        {buckets.map((count, i) => (
          <div key={i} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 flex-col justify-end">
              <div
                className="w-full rounded-t bg-emerald-500/50"
                style={{ height: `${(count / maxB) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
              />
            </div>
            <span className="max-w-[52px] truncate text-center text-[9px] text-gray-500">
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Pico: <span className="text-slate-300">{peakLabel}</span>
      </p>
    </div>
  )
}
