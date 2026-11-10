import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import { DOF_CONNECTOR_KIND, DOF_SOURCE_KEY } from '@/lib/ciceron/dof/constants'
import { isWeekendIso } from '@/lib/ciceron/dof/dates'

export async function recordSourceIncidentsForRun(opts: {
  targetDate: string
  listed: number
  status: 'succeeded' | 'failed' | 'partial'
}) {
  const db = tryCreateCiceronAdminClient()
  if (!db) return

  // Zero notes on a weekday is an incident (weekend extraordinarias may be empty)
  if (opts.listed === 0 && !isWeekendIso(opts.targetDate) && opts.status !== 'failed') {
    await db.from('source_incidents').upsert(
      {
        source_key: DOF_SOURCE_KEY,
        incident_date: opts.targetDate,
        kind: 'zero_notes',
        severity: 'warning',
        message: `Día hábil ${opts.targetDate} sin notas en SIDOF.`,
        details: { listed: 0 },
      },
      { onConflict: 'source_key,incident_date,kind' }
    )
  }

  if (opts.status !== 'failed') return

  const { data: recent } = await db
    .from('connector_runs')
    .select('id, status, started_at')
    .eq('connector_kind', DOF_CONNECTOR_KIND)
    .order('started_at', { ascending: false })
    .limit(5)

  const runs = (Array.isArray(recent) ? recent : []) as {
    id: string
    status: string
    started_at: string
  }[]
  const lastTwo = runs.slice(0, 2)
  if (lastTwo.length === 2 && lastTwo.every((r) => r.status === 'failed')) {
    await db.from('source_incidents').upsert(
      {
        source_key: DOF_SOURCE_KEY,
        incident_date: opts.targetDate,
        kind: 'consecutive_failures',
        severity: 'critical',
        message: 'Dos ejecuciones consecutivas del conector SIDOF fallaron.',
        details: { run_ids: lastTwo.map((r) => r.id) },
      },
      { onConflict: 'source_key,incident_date,kind' }
    )
  }
}

export type FuentesDashboard = {
  incidents: {
    id: string
    incident_date: string
    kind: string
    severity: string
    message: string
    resolved_at: string | null
    created_at: string
  }[]
  runs: {
    id: string
    status: string
    target_date: string | null
    started_at: string
    finished_at: string | null
    error_message: string | null
    stats: Record<string, unknown>
  }[]
}

export async function loadFuentesDashboard(): Promise<FuentesDashboard> {
  const empty: FuentesDashboard = { incidents: [], runs: [] }
  const db = tryCreateCiceronAdminClient()
  if (!db) return empty

  const { data: incidents } = await db
    .from('source_incidents')
    .select('id, incident_date, kind, severity, message, resolved_at, created_at')
    .eq('source_key', DOF_SOURCE_KEY)
    .order('incident_date', { ascending: false })
    .limit(30)

  const { data: runs } = await db
    .from('connector_runs')
    .select('id, status, target_date, started_at, finished_at, error_message, stats')
    .eq('connector_kind', DOF_CONNECTOR_KIND)
    .order('started_at', { ascending: false })
    .limit(40)

  return {
    incidents: (Array.isArray(incidents) ? incidents : []) as FuentesDashboard['incidents'],
    runs: (Array.isArray(runs) ? runs : []) as FuentesDashboard['runs'],
  }
}
