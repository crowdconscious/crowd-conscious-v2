/**
 * Per-firm AI budget gate for the Cicéron gateway (Prompt 8).
 * Research pauses at 100%; DOF monitoring purposes are exempt.
 */

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'

const DEFAULT_MONTHLY_USD = 50

/** Purposes that must keep running when research is paused (DOF monitoring). */
export const DOF_BUDGET_EXEMPT_PURPOSES = [
  'dof_classify',
  'dof_match_relevance',
  'dof_embed_chunks',
  'dof_embed_backfill',
  'dof_client_alert_draft',
] as const

export type BudgetStatus = {
  spentUsd: number
  budgetUsd: number
  ratio: number
  threshold: 0 | 50 | 80 | 100
  researchPaused: boolean
  message: string | null
  /** Spanish (usted) threshold alerts for admin/Hoy banners. */
  alertMessage: string | null
}

export function isDofExemptPurpose(purpose: string): boolean {
  const base = purpose.split(':')[0] ?? purpose
  return (DOF_BUDGET_EXEMPT_PURPOSES as readonly string[]).includes(base) ||
    base.startsWith('dof_')
}

export function budgetStatusFromSpend(
  spentUsd: number,
  budgetUsd: number
): BudgetStatus {
  const safeBudget = budgetUsd > 0 ? budgetUsd : DEFAULT_MONTHLY_USD
  const ratio = spentUsd / safeBudget
  let threshold: BudgetStatus['threshold'] = 0
  if (ratio >= 1) threshold = 100
  else if (ratio >= 0.8) threshold = 80
  else if (ratio >= 0.5) threshold = 50

  const researchPaused = threshold === 100
  let alertMessage: string | null = null
  if (threshold === 50) {
    alertMessage = `Ha consumido el 50 % del presupuesto mensual de IA (USD ${spentUsd.toFixed(2)} de ${safeBudget.toFixed(2)}).`
  } else if (threshold === 80) {
    alertMessage = `Ha consumido el 80 % del presupuesto mensual de IA (USD ${spentUsd.toFixed(2)} de ${safeBudget.toFixed(2)}). Considere priorizar consultas.`
  } else if (threshold === 100) {
    alertMessage = `Se alcanzó el 100 % del presupuesto mensual de IA (USD ${spentUsd.toFixed(2)} de ${safeBudget.toFixed(2)}). La investigación está en pausa; el monitoreo del Diario Oficial continúa.`
  }

  return {
    spentUsd,
    budgetUsd: safeBudget,
    ratio,
    threshold,
    researchPaused,
    message: researchPaused
      ? 'La investigación está en pausa por presupuesto. El monitoreo del Diario Oficial continúa.'
      : null,
    alertMessage,
  }
}

export async function loadFirmBudgetStatus(firmId: string): Promise<BudgetStatus> {
  const db = tryCreateCiceronAdminClient()
  let budgetUsd = Number(process.env.CICERON_FIRM_AI_BUDGET_USD) || DEFAULT_MONTHLY_USD

  if (!db) {
    return budgetStatusFromSpend(0, budgetUsd)
  }

  const { data: rows } = await db
    .from('firm_ai_budgets')
    .select(
      'monthly_budget_usd, threshold_alert_50_at, threshold_alert_80_at, threshold_alert_100_at'
    )
    .eq('firm_id', firmId)
    .limit(1)

  if (Array.isArray(rows) && rows[0]) {
    budgetUsd = Number(
      (rows[0] as { monthly_budget_usd: number }).monthly_budget_usd
    )
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

  const status = budgetStatusFromSpend(spentUsd, budgetUsd)

  // Persist first-crossing timestamps (best-effort; columns may be absent pre-314)
  if (Array.isArray(rows) && rows[0] && status.threshold > 0) {
    const row = rows[0] as {
      threshold_alert_50_at: string | null
      threshold_alert_80_at: string | null
      threshold_alert_100_at: string | null
    }
    const patch: Record<string, string> = {}
    const now = new Date().toISOString()
    if (status.threshold >= 50 && !row.threshold_alert_50_at) {
      patch.threshold_alert_50_at = now
    }
    if (status.threshold >= 80 && !row.threshold_alert_80_at) {
      patch.threshold_alert_80_at = now
    }
    if (status.threshold >= 100 && !row.threshold_alert_100_at) {
      patch.threshold_alert_100_at = now
    }
    if (Object.keys(patch).length) {
      await db.from('firm_ai_budgets').update(patch).eq('firm_id', firmId)
    }
  }

  return status
}

export type GatewayBudgetCheck =
  | { ok: true; status: BudgetStatus }
  | { ok: false; status: BudgetStatus; message: string }

/**
 * Enforce research pause at 100%. DOF purposes always pass.
 */
export async function assertGatewayBudget(opts: {
  firmId?: string | null
  purpose: string
}): Promise<GatewayBudgetCheck> {
  if (!opts.firmId) {
    const status = budgetStatusFromSpend(0, DEFAULT_MONTHLY_USD)
    return { ok: true, status }
  }
  if (isDofExemptPurpose(opts.purpose)) {
    const status = await loadFirmBudgetStatus(opts.firmId)
    return { ok: true, status }
  }
  const status = await loadFirmBudgetStatus(opts.firmId)
  if (status.researchPaused) {
    return {
      ok: false,
      status,
      message:
        status.message ??
        'La investigación está en pausa por presupuesto. El monitoreo del Diario Oficial continúa.',
    }
  }
  return { ok: true, status }
}
