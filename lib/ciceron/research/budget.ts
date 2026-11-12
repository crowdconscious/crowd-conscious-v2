/**
 * Research budget check — delegates to gateway (Prompt 8).
 * Kept for call sites in research/answer.ts.
 */

import {
  loadFirmBudgetStatus,
  type BudgetStatus,
} from '@/lib/ciceron/gateway/budget'

export type BudgetCheck =
  | { ok: true; spentUsd: number; budgetUsd: number }
  | { ok: false; message: string; spentUsd: number; budgetUsd: number }

/** Per-firm monthly AI spend gate. Research pauses at 100%. */
export async function checkFirmBudget(firmId: string): Promise<BudgetCheck> {
  const status: BudgetStatus = await loadFirmBudgetStatus(firmId)
  if (status.researchPaused) {
    return {
      ok: false,
      spentUsd: status.spentUsd,
      budgetUsd: status.budgetUsd,
      message:
        status.message ??
        `Se alcanzó el presupuesto mensual de IA del despacho (USD ${status.spentUsd.toFixed(2)} / ${status.budgetUsd.toFixed(2)}). La investigación está en pausa; el monitoreo del Diario Oficial continúa.`,
    }
  }
  return {
    ok: true,
    spentUsd: status.spentUsd,
    budgetUsd: status.budgetUsd,
  }
}
