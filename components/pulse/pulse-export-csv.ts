export type PulseCsvVote = {
  created_at: string
  outcome_id: string
  outcome_label: string
  confidence: number
  kind: 'registered' | 'anonymous'
  reasoning?: string | null
}

export function exportPulseVotesCsv(votes: PulseCsvVote[], marketTitle: string) {
  const headers = ['Date', 'Outcome', 'Confidence', 'Type', 'Reasoning']
  const rows = votes.map((v) => [
    new Date(v.created_at).toISOString(),
    `"${(v.outcome_label || v.outcome_id).replace(/"/g, '""')}"`,
    String(v.confidence),
    v.kind,
    `"${String(v.reasoning ?? '').replace(/"/g, '""')}"`,
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
