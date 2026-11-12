/**
 * Score classification + matching against a human-filled labelled CSV.
 * Do NOT run until a human has filled human_* columns.
 * Do NOT auto-label.
 *
 * Usage:
 *   npx tsx scripts/ciceron/score-labelled-set.ts --in=docs/ciceron/labelled-set.csv
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const CLIENT_COLUMNS = [
  { col: 'human_relevant_client_nexora', hint: 'nexora' },
  { col: 'human_relevant_client_farma', hint: 'farma' },
  { col: 'human_relevant_client_viento', hint: 'viento' },
  { col: 'human_relevant_client_4', hint: 'aduanal|delta|pacífico|pacifico' },
  { col: 'human_relevant_client_5', hint: 'pedregal|inmueble' },
  { col: 'human_relevant_client_6', hint: 'bajío|bajio|alimento' },
] as const

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = splitCsvLine(lines[0]!)
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    header.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
    return row
  })
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else if (ch === '"') inQ = false
      else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

function parseYesNo(raw: string): boolean | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if (['y', 'yes', 'si', 'sí', '1', 'true', 'relevante'].includes(v)) return true
  if (['n', 'no', '0', 'false', 'no_relevante', 'irrelevante'].includes(v)) {
    return false
  }
  return null
}

async function main() {
  const input = arg('in') ?? 'docs/ciceron/labelled-set.csv'
  const rows = parseCsv(readFileSync(input, 'utf8'))
  const labelled = rows.filter(
    (r) => (r.human_subject_area ?? '').trim().length > 0
  )
  if (!labelled.length) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'no_labels',
        message:
          'No human_subject_area values found. Do not report precision until a human labels the file.',
      })
    )
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const sb = createClient(url, key, { db: { schema: 'ciceron' } })

  let subjectHits = 0
  let subjectTotal = 0
  for (const row of labelled) {
    subjectTotal += 1
    const { data } = await sb
      .from('classifications')
      .select('labels')
      .eq('dof_note_id', row.note_id)
      .is('chunk_id', null)
      .limit(1)
    const labels =
      Array.isArray(data) && data[0]
        ? ((data[0] as { labels: string[] }).labels ?? [])
        : []
    const human = row.human_subject_area.trim().toLowerCase()
    if (labels.map((l) => l.toLowerCase()).includes(human)) subjectHits += 1
  }

  // Matching: compare human yes/no per client column to stored matches
  const { data: clients } = await sb
    .from('clients')
    .select('id, display_name')
    .eq('is_demo', true)
  const clientRows = (Array.isArray(clients) ? clients : []) as {
    id: string
    display_name: string
  }[]
  const { data: profiles } = await sb
    .from('watch_profiles')
    .select('id, client_id')
    .eq('is_demo', true)
  const profileRows = (Array.isArray(profiles) ? profiles : []) as {
    id: string
    client_id: string
  }[]

  let matchHits = 0
  let matchTotal = 0
  for (const row of labelled) {
    const { data: matchData } = await sb
      .from('matches')
      .select('watch_profile_id')
      .eq('dof_note_id', row.note_id)
    const matchedProfileIds = new Set(
      ((Array.isArray(matchData) ? matchData : []) as { watch_profile_id: string }[]).map(
        (m) => m.watch_profile_id
      )
    )
    const matchedClientIds = new Set(
      profileRows
        .filter((p) => matchedProfileIds.has(p.id))
        .map((p) => p.client_id)
    )

    for (const { col, hint } of CLIENT_COLUMNS) {
      const human = parseYesNo(row[col] ?? '')
      if (human === null) continue
      matchTotal += 1
      const re = new RegExp(hint, 'i')
      const client = clientRows.find((c) => re.test(c.display_name))
      if (!client) continue
      const modelRelevant = matchedClientIds.has(client.id)
      if (modelRelevant === human) matchHits += 1
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      labelledRows: labelled.length,
      classificationSubjectAccuracy: subjectTotal
        ? Number((subjectHits / subjectTotal).toFixed(4))
        : null,
      matchingAccuracy:
        matchTotal > 0 ? Number((matchHits / matchTotal).toFixed(4)) : null,
      matchingPairsScored: matchTotal,
      note:
        matchTotal === 0
          ? 'Fill human_relevant_client_* (yes/no) to score matching precision.'
          : undefined,
    })
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
