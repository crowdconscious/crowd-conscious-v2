import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'

const DEFAULT_MONTHLY_USD = 50

export type BudgetCheck =
  | { ok: true; spentUsd: number; budgetUsd: number }
  | { ok: false; message: string; spentUsd: number; budgetUsd: number }

/** Per-firm monthly AI spend gate (Prompt 5 LIMITS). */
export async function checkFirmBudget(firmId: string): Promise<BudgetCheck> {
  const db = tryCreateCiceronAdminClient()
  let budgetUsd = Number(process.env.CICERON_FIRM_AI_BUDGET_USD) || DEFAULT_MONTHLY_USD

  if (!db) {
    return { ok: true, spentUsd: 0, budgetUsd }
  }

  const { data: rows } = await db
    .from('firm_ai_budgets')
    .select('monthly_budget_usd')
    .eq('firm_id', firmId)
    .limit(1)
  if (Array.isArray(rows) && rows[0]) {
    budgetUsd = Number((rows[0] as { monthly_budget_usd: number }).monthly_budget_usd)
  }

  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)

  const { data: runs } = await db
    .from('ai_runs')
    .select('cost_estimate_usd')
    .eq('firm_id', firmId)
    .gte('created_at', start.toISOString())

  const spentUsd = (Array.isArray(runs) ? runs : []).reduce((sum, r) => {
    const c = (r as { cost_estimate_usd: number | null }).cost_estimate_usd
    return sum + (typeof c === 'number' ? c : 0)
  }, 0)

  if (spentUsd >= budgetUsd) {
    return {
      ok: false,
      spentUsd,
      budgetUsd,
      message: `Se alcanzó el presupuesto mensual de IA del despacho (USD ${spentUsd.toFixed(2)} / ${budgetUsd.toFixed(2)}). Contacte al administrador.`,
    }
  }
  return { ok: true, spentUsd, budgetUsd }
}
