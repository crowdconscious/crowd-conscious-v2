import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isSimViewerEnabled } from '@/lib/sim-viewer-flag'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  buildOptionLabelIndex,
  resolveOptionId,
} from '@/lib/sim-viewer/legacy'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Visor de simulación — corridas',
  robots: { index: false, follow: false },
}

type RunListRow = {
  id: string
  market_id: string | null
  status: string
  created_at: string | null
  completed_at: string | null
  n_agents: number
  is_fixture: boolean
  revealed_at: string | null
  divergence_index: number | null
  pulse_title: string | null
  votes_total: number
  votes_resolved: number
}

/**
 * /admin/sim-viewer — list real (non-fixture) complete simulation runs so
 * the owner can open past Pulse replays. Fixture link kept as a shortcut.
 *
 * Auth: app/admin/layout.tsx. Flag: NEXT_PUBLIC_SIM_VIEWER_ENABLED.
 */
export default async function AdminSimViewerIndexPage() {
  if (!isSimViewerEnabled()) {
    notFound()
  }

  const admin = createAdminClient()

  const { data: runsRaw, error } = await admin
    .from('simulation_runs')
    .select(
      `
      id,
      market_id,
      status,
      created_at,
      completed_at,
      n_agents,
      is_fixture,
      revealed_at,
      divergence_index,
      is_brand_pretest
    `,
    )
    .eq('status', 'complete')
    .eq('is_fixture', false)
    .or('is_brand_pretest.eq.false,is_brand_pretest.is.null')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[admin/sim-viewer] list runs failed', error.message)
  }

  const runs = (runsRaw ?? []) as Array<{
    id: string
    market_id: string | null
    status: string
    created_at: string | null
    completed_at: string | null
    n_agents: number
    is_fixture: boolean
    revealed_at: string | null
    divergence_index: number | null
  }>

  const marketIds = [
    ...new Set(
      runs
        .map((r) => r.market_id)
        .filter((id): id is string => typeof id === 'string'),
    ),
  ]

  const titleById = new Map<string, string>()
  if (marketIds.length > 0) {
    const { data: markets } = await admin
      .from('prediction_markets')
      .select('id, title')
      .in('id', marketIds)
    for (const m of markets ?? []) {
      titleById.set(m.id, m.title)
    }
  }

  const list: RunListRow[] = []

  for (const run of runs) {
    if (!run.market_id) continue

    const [{ data: votesRaw }, { data: outcomesRaw }] = await Promise.all([
      admin
        .from('simulation_votes')
        .select('option_id, option_chosen, sequence_index, persona_id')
        .eq('run_id', run.id),
      admin
        .from('market_outcomes')
        .select('id, label')
        .eq('market_id', run.market_id),
    ])

    const labelIndex = buildOptionLabelIndex(outcomesRaw ?? [])
    const votes = votesRaw ?? []
    let resolved = 0
    for (const v of votes) {
      if (!v.persona_id) continue
      const oid = resolveOptionId(
        {
          option_id: v.option_id,
          option_chosen: v.option_chosen,
        },
        labelIndex,
      )
      if (oid) resolved += 1
    }

    list.push({
      id: run.id,
      market_id: run.market_id,
      status: run.status,
      created_at: run.created_at,
      completed_at: run.completed_at,
      n_agents: run.n_agents,
      is_fixture: run.is_fixture,
      revealed_at: run.revealed_at,
      divergence_index: run.divergence_index,
      pulse_title: titleById.get(run.market_id) ?? null,
      votes_total: votes.length,
      votes_resolved: resolved,
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/80">
            Visor de simulación
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-100">
            Corridas reales
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Simulaciones completas (no fixture, no brand-pretest) listas para
            replay. Los votos sin option_id se resuelven por etiqueta en
            lectura.
          </p>
        </div>
        <Link
          href="/admin/sim-viewer/fixture"
          className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-amber-400/50 hover:text-amber-100"
        >
          Abrir fixture
        </Link>
      </header>

      {list.length === 0 ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-6 text-sm text-slate-400">
          No hay corridas completas todavía. Cuando el pipeline termine un
          run sobre un Pulse, aparecerá aquí.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Pulse</th>
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Votos</th>
                <th className="px-3 py-2 font-semibold">Divergencia</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 font-semibold">Replay</th>
              </tr>
            </thead>
            <tbody>
              {list.map((run) => {
                const dateIso = run.completed_at ?? run.created_at
                const dateLabel = dateIso
                  ? new Date(dateIso).toLocaleString('es-MX', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '—'
                const href = `/pulse/${run.market_id}/simulacion?runId=${run.id}`
                return (
                  <tr
                    key={run.id}
                    className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/40"
                  >
                    <td className="max-w-xs px-3 py-2.5">
                      <div className="font-medium text-slate-100">
                        {run.pulse_title ?? 'Pulse sin título'}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                        {run.market_id}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">
                      {dateLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-300">
                      {run.votes_resolved}/{run.votes_total}
                      {run.votes_resolved < run.votes_total ? (
                        <span className="ml-1 text-[10px] text-amber-400/80">
                          ({run.votes_total - run.votes_resolved} sin
                          resolver)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-amber-200">
                      {run.divergence_index == null
                        ? '—'
                        : Math.round(Number(run.divergence_index))}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">
                      {run.revealed_at ? 'revelada' : 'sin revelar'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={href}
                        className="font-medium text-emerald-300 underline-offset-2 hover:underline"
                      >
                        Ver simulación
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
