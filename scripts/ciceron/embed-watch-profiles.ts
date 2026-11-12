/**
 * Embed all demo watch profiles (idempotent). Turns on the vector stage of matching.
 *
 * Usage:
 *   npx tsx scripts/ciceron/embed-watch-profiles.ts --dry-run
 *   npx tsx scripts/ciceron/embed-watch-profiles.ts
 *
 * Do NOT run against production without CTO approval.
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI Gateway auth.
 */
import { createClient } from '@supabase/supabase-js'
import { embedTexts } from '../../lib/ciceron/gateway/embeddings'
import { CICERON_EMBEDDING_MODEL } from '../../lib/ciceron/db/types'
import {
  assertUnderCap,
  estimateFromRates,
  parseFlags,
  type AiRunRate,
} from './_cost-cap'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadRates(sb: any): Promise<AiRunRate[]> {
  const { data } = await sb
    .from('ai_runs')
    .select('purpose, cost_estimate_usd')
    .or('purpose.ilike.%embed%,purpose.eq.watch_profile_embed')
    .limit(200)
  const rows = (Array.isArray(data) ? data : []) as {
    purpose: string
    cost_estimate_usd: number | null
  }[]
  const by = new Map<string, number[]>()
  for (const r of rows) {
    if (r.cost_estimate_usd == null || r.cost_estimate_usd <= 0) continue
    const list = by.get(r.purpose) ?? []
    list.push(Number(r.cost_estimate_usd))
    by.set(r.purpose, list)
  }
  return [...by.entries()].map(([purpose, costs]) => ({
    purpose,
    avgCostUsd: costs.reduce((a, b) => a + b, 0) / costs.length,
    sampleSize: costs.length,
  }))
}

async function main() {
  const { dryRun } = parseFlags(process.argv.slice(2))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const sb = createClient(url, key, { db: { schema: 'ciceron' } })

  const { data: profiles, error } = await sb
    .from('watch_profiles')
    .select(
      'id, description, subject_areas, authorities, keywords, norms_of_interest, embedding'
    )
    .eq('is_demo', true)
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  const rows = (Array.isArray(profiles) ? profiles : []) as {
    id: string
    description: string | null
    subject_areas: string[]
    authorities: string[]
    keywords: string[]
    norms_of_interest: string[]
    embedding: number[] | null
  }[]
  const pending = rows.filter((p) => !p.embedding || p.embedding.length === 0)
  const rates = await loadRates(sb)
  const estimateUsd = estimateFromRates(
    rates,
    'watch_profile_embed',
    pending.length,
    0.0001
  )

  console.log(
    JSON.stringify({
      dryRun,
      totalProfiles: rows.length,
      pendingEmbeddings: pending.length,
      alreadyEmbedded: rows.length - pending.length,
      estimateUsd,
      ratesSampled: rates,
    })
  )

  assertUnderCap({
    estimateUsd,
    dryRun,
    label: 'embed-watch-profiles',
  })

  if (dryRun) {
    console.log(JSON.stringify({ ok: true, skipped: 'dry-run' }))
    return
  }

  let embedded = 0
  for (const p of pending) {
    const text = [
      p.description ?? '',
      `Materias: ${(p.subject_areas ?? []).join(', ')}`,
      `Autoridades: ${(p.authorities ?? []).join(', ')}`,
      `Palabras clave: ${(p.keywords ?? []).join(', ')}`,
      `Normas: ${(p.norms_of_interest ?? []).join(', ')}`,
    ]
      .join('\n')
      .slice(0, 8000)
    const result = await embedTexts([text], {
      purpose: 'watch_profile_embed',
    })
    if (!result.ok || !result.vectors[0]) {
      console.error(
        JSON.stringify({
          ok: false,
          profileId: p.id,
          error: result.ok === false ? result.message : 'empty vector',
        })
      )
      continue
    }
    const { error: upErr } = await sb
      .from('watch_profiles')
      .update({
        embedding: result.vectors[0],
        embedding_model: CICERON_EMBEDDING_MODEL,
      })
      .eq('id', p.id)
    if (upErr) {
      console.error(upErr.message)
      continue
    }
    embedded += 1
  }

  console.log(JSON.stringify({ ok: true, embedded, pending: pending.length }))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
