/**
 * Export 100 DOF notes stratified by subject area and document type for human labelling.
 * Leaves empty columns for subject_area_label and relevance_per_client.
 *
 * Usage:
 *   npx tsx scripts/ciceron/export-labelled-set.ts --out=docs/ciceron/labelled-set.csv
 *
 * Do NOT label the notes yourself. Do NOT report precision until a human has labelled.
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const out = arg('out') ?? 'docs/ciceron/labelled-set.csv'
  const sb = createClient(url, key, { db: { schema: 'ciceron' } })

  const { data: classRows, error } = await sb
    .from('classifications')
    .select('dof_note_id, labels, document_type, summary, authority')
    .is('chunk_id', null)
    .limit(2000)
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  const classifications = (Array.isArray(classRows) ? classRows : []) as {
    dof_note_id: string
    labels: string[]
    document_type: string | null
    summary: string | null
    authority: string | null
  }[]

  const noteIds = classifications.map((c) => c.dof_note_id)
  const { data: notes } = await sb
    .from('dof_notes')
    .select('id, note_code, title, note_date')
    .in('id', noteIds)
  const noteMap = new Map(
    ((Array.isArray(notes) ? notes : []) as {
      id: string
      note_code: string
      title: string | null
      note_date: string
    }[]).map((n) => [n.id, n])
  )

  // Stratify by document_type × first subject area
  const buckets = new Map<string, typeof classifications>()
  for (const c of classifications) {
    const key = `${c.document_type ?? 'otro'}|${c.labels[0] ?? 'otros'}`
    const list = buckets.get(key) ?? []
    list.push(c)
    buckets.set(key, list)
  }
  const target = 100
  const selected: typeof classifications = []
  const keys = [...buckets.keys()]
  let i = 0
  while (selected.length < target && keys.length) {
    const key = keys[i % keys.length]!
    const list = buckets.get(key)!
    const next = list.shift()
    if (next) selected.push(next)
    if (!list.length) {
      buckets.delete(key)
      keys.splice(i % keys.length, 1)
      continue
    }
    i += 1
  }

  const header = [
    'note_id',
    'note_code',
    'note_date',
    'title',
    'authority',
    'model_document_type',
    'model_subject_areas',
    'summary',
    'human_subject_area',
    'human_relevant_client_nexora',
    'human_relevant_client_farma',
    'human_relevant_client_viento',
    'human_relevant_client_4',
    'human_relevant_client_5',
    'human_relevant_client_6',
    'notes',
  ]

  const lines = [header.join(',')]
  for (const c of selected) {
    const n = noteMap.get(c.dof_note_id)
    lines.push(
      [
        c.dof_note_id,
        n?.note_code ?? '',
        n?.note_date ?? '',
        csvEscape(n?.title ?? ''),
        csvEscape(c.authority ?? ''),
        csvEscape(c.document_type ?? ''),
        csvEscape((c.labels ?? []).join(';')),
        csvEscape((c.summary ?? '').slice(0, 400)),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ].join(',')
    )
  }

  writeFileSync(out, lines.join('\n'), 'utf8')
  console.log(
    JSON.stringify({
      ok: true,
      out,
      exported: selected.length,
      buckets: keys.length,
      note: 'Leave human_* columns empty for the lawyer. Do not auto-label.',
    })
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
