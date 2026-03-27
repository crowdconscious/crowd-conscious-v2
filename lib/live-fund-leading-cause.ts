import type { SupabaseClient } from '@supabase/supabase-js'

export function getFundVoteCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

/**
 * Leading Conscious Fund cause for the current monthly cycle (same logic as /predictions/fund).
 */
export async function fetchLeadingFundCause(
  supabase: SupabaseClient
): Promise<{ id: string; name: string } | null> {
  const cycle = getFundVoteCycle()
  const { data: causes, error: cErr } = await supabase
    .from('fund_causes')
    .select('id, name')
    .eq('active', true)
    .order('name')

  if (cErr || !causes?.length) return null

  const { data: votes } = await supabase.from('fund_votes').select('cause_id').eq('cycle', cycle)

  const voteCountByCause: Record<string, number> = {}
  for (const v of votes ?? []) {
    const id = v.cause_id
    voteCountByCause[id] = (voteCountByCause[id] ?? 0) + 1
  }

  let leader = causes[0]!
  let max = voteCountByCause[leader.id] ?? 0
  for (const c of causes) {
    const n = voteCountByCause[c.id] ?? 0
    if (n > max) {
      leader = c
      max = n
    }
  }

  return { id: leader.id, name: leader.name }
}
