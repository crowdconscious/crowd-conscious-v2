/**
 * Export evaluation candidates (approve-with-edits / reject) per firm.
 *
 * Usage:
 *   npx tsx scripts/ciceron-export-eval-candidates.ts --firm=<uuid>
 *   npx tsx scripts/ciceron-export-eval-candidates.ts --firm=demo
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 * Writes JSON to stdout (or --out=path).
 */

import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const DEMO_FIRM = 'a1000000-0000-4000-8000-000000000001'

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

async function main() {
  const firmRaw = arg('firm') ?? 'demo'
  const firmId = firmRaw === 'demo' ? DEMO_FIRM : firmRaw
  const out = arg('out')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const sb = createClient(url, key, { db: { schema: 'ciceron' } })
  const { data, error } = await sb
    .from('evaluation_candidates')
    .select(
      'id, firm_id, matter_id, review_decision_id, ai_run_id, ai_output_id, model_output, human_output, reason, decision, created_at'
    )
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  const payload = {
    firm_id: firmId,
    exported_at: new Date().toISOString(),
    count: Array.isArray(data) ? data.length : 0,
    candidates: data ?? [],
  }
  const json = JSON.stringify(payload, null, 2)
  if (out) {
    writeFileSync(out, json, 'utf8')
    console.error(`Wrote ${payload.count} candidates to ${out}`)
  } else {
    process.stdout.write(json + '\n')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
