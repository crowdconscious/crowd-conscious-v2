/**
 * One-off: run + lock the Contraste IA prediction for ONE Pulse without
 * publishing it (works on drafts). Refuses if the Pulse already has votes
 * unless --allow-late. Needs ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY in the environment.
 *
 *   npx tsx --conditions=react-server --tsconfig tsconfig.json \
 *     scripts/contraste-ia-lock-one.ts 567ca93b-e833-41dc-bf81-d5deaf3c9984
 */
import { createClient } from '@supabase/supabase-js'
import { ensurePredictionLocked } from '@/lib/contraste-ia/server'

async function main() {
  const id = process.argv[2]
  if (!id) throw new Error('usage: contraste-ia-lock-one.ts <market_id> [--allow-late]')
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const { count } = await admin.from('market_votes').select('id', { count: 'exact', head: true }).eq('market_id', id)
  if ((count ?? 0) > 0 && !process.argv.includes('--allow-late')) {
    throw new Error(`Pulse has ${count} votes; refusing (would be marked late). Pass --allow-late to force.`)
  }
  const r = await ensurePredictionLocked(admin, id, 'manual')
  console.log(JSON.stringify(r, null, 2))
  if (r.ok && !r.skipped) {
    const { data } = await admin
      .from('pulse_ai_predictions')
      .select('locked_at, status, option_distribution, option_spread, avg_confidence, n_runs, n_personas, model, model_calls, cost_usd')
      .eq('id', r.id)
      .single()
    console.log(JSON.stringify(data, null, 2))
  }
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
