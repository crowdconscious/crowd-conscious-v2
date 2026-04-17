import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Canonical balance for UI: `conscious_fund.current_balance` (Stripe webhook + trade fees).
 * Do not use `a || b` — when balance is 0, that wrongly falls through to `total_collected - total_disbursed`.
 */
export function consciousFundBalanceMxn(
  fund:
    | {
        current_balance?: number | null
      }
    | null
    | undefined
): number {
  if (!fund) return 0
  const n = Number(fund.current_balance ?? 0)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/**
 * Server-side fetch of the canonical Conscious Fund balance in MXN. Uses the
 * admin client so it always returns the real number regardless of the
 * caller's auth state or `conscious_fund` RLS policies.
 *
 * Use this from any server component that renders a fund total (landing,
 * /about, dashboard, footer SSR). Client components should call
 * `/api/fund/balance` instead, which wraps this same source.
 */
export async function fetchConsciousFundBalanceMxn(): Promise<number> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('conscious_fund')
      .select('current_balance')
      .limit(1)
      .single()
    return consciousFundBalanceMxn(data ?? undefined)
  } catch (err) {
    console.warn('[fetchConsciousFundBalanceMxn] admin read failed', err)
    return 0
  }
}
