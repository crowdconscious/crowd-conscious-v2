import { formatVoteTimestampCdmx } from '@/lib/pulse-vote-timing'

export type PulseCsvVote = {
  created_at: string
  outcome_id: string
  outcome_label: string
  confidence: number
  kind: 'registered' | 'anonymous'
  reasoning?: string | null
  rank2_label?: string
  rank3_label?: string
  other_text?: string | null
  /** Multi: "label:conf; label:conf" — keeps old columns for primary. */
  selections?: string | null
}

export function exportPulseVotesCsv(votes: PulseCsvVote[], marketTitle: string) {
  const headers = [
    'Date_UTC',
    'Date_CDMX',
    'Outcome',
    'Rank_2',
    'Rank_3',
    'Confidence',
    'Type',
    'Reasoning',
    'Other_text',
    'Selections',
  ]
  const rows = votes.map((v) => [
    new Date(v.created_at).toISOString(),
    `"${formatVoteTimestampCdmx(v.created_at, 'es').replace(/"/g, '""')}"`,
    `"${(v.outcome_label || v.outcome_id).replace(/"/g, '""')}"`,
    `"${String(v.rank2_label ?? '').replace(/"/g, '""')}"`,
    `"${String(v.rank3_label ?? '').replace(/"/g, '""')}"`,
    String(v.confidence),
    v.kind,
    `"${String(v.reasoning ?? '').replace(/"/g, '""')}"`,
    `"${String(v.other_text ?? '').replace(/"/g, '""')}"`,
    `"${String(v.selections ?? '').replace(/"/g, '""')}"`,
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safe = marketTitle.slice(0, 30).replace(/[^\w\s-]/g, '').trim() || 'pulse'
  a.download = `pulse-${safe}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
