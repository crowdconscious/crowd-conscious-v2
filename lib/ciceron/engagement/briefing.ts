/**
 * On-demand morning briefing + weekly socio summary.
 * No Vercel cron (DOF scheduled crons were removed in PR #83).
 * Email only if firm_settings.email_allowlist is non-empty (demo: empty → simulate).
 */

import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import { loadHoyBriefing } from '@/lib/ciceron/demo/monitor-data'
import { loadDeadlines } from '@/lib/ciceron/demo/data'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import { isEmailAllowlisted } from '@/lib/ciceron/engagement/email'

export type BriefingLine = {
  kind: 'match' | 'review' | 'deadline' | 'empty'
  text: string
  href: string
}

export type MorningBriefing = {
  lines: BriefingLine[]
  empty: boolean
  reviewedCount: number
  emailSimulated: boolean
  generatedAt: string
  alreadyShownEmptyToday: boolean
}

export type WeeklySocioSummary = {
  publishedForClients: number
  approvedAndSent: number
  deadlinesConfirmed: number
  reviewTurnaroundLabel: string
  lines: BriefingLine[]
  emailSimulated: boolean
  generatedAt: string
}

function todayCdmx(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function generateMorningBriefing(
  persona: DemoPersona
): Promise<MorningBriefing> {
  const [briefing, { deadlines }, allowlisted] = await Promise.all([
    loadHoyBriefing(persona),
    loadDeadlines(persona),
    isEmailAllowlisted(persona.firmId, null),
  ])

  const lines: BriefingLine[] = []

  for (const [clientName, items] of briefing.byClient.entries()) {
    for (const item of items.slice(0, 3)) {
      lines.push({
        kind: 'match',
        text: `${clientName}: ${item.title}`,
        href: '/ciceron/monitor-dof',
      })
    }
  }

  for (const r of briefing.reviews.slice(0, 5)) {
    lines.push({
      kind: 'review',
      text: `Revisión pendiente: ${r.title} (${r.clientName})`,
      href: `/ciceron/revision/${r.id}`,
    })
  }

  for (const d of deadlines.slice(0, 5)) {
    lines.push({
      kind: 'deadline',
      text: `Plazo: ${d.label} — ${d.due} (${d.clientName})`,
      href: '/ciceron/expedientes/calendario',
    })
  }

  const empty = lines.length === 0
  let alreadyShownEmptyToday = false

  const db = tryCreateCiceronAdminClient()
  if (db && empty) {
    const { data } = await db
      .from('briefing_previews')
      .select('id')
      .eq('firm_id', persona.firmId)
      .eq('user_id', persona.id)
      .eq('preview_date', todayCdmx())
      .eq('kind', 'morning')
      .eq('empty_state', true)
      .limit(1)
    alreadyShownEmptyToday = Array.isArray(data) && data.length > 0
  }

  if (empty) {
    lines.push({
      kind: 'empty',
      text: `Sin novedades para sus clientes (${briefing.totalClassified} notas revisadas).`,
      href: '/ciceron/hoy',
    })
  }

  if (db) {
    await db.from('briefing_previews').upsert(
      {
        firm_id: persona.firmId,
        user_id: persona.id,
        preview_date: todayCdmx(),
        kind: 'morning',
        line_count: lines.length,
        empty_state: empty,
        reviewed_count: briefing.totalClassified,
        payload: { line_count: lines.length },
        email_simulated: !allowlisted,
        is_demo: true,
      },
      { onConflict: 'firm_id,user_id,preview_date,kind' }
    )
  }

  await recordCiceronEvent({
    name: 'briefing_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { kind: 'morning', is_demo: true },
  })

  return {
    lines,
    empty,
    reviewedCount: briefing.totalClassified,
    emailSimulated: !allowlisted,
    generatedAt: new Date().toISOString(),
    alreadyShownEmptyToday,
  }
}

export async function generateWeeklySocioSummary(
  persona: DemoPersona
): Promise<WeeklySocioSummary> {
  const allowlisted = await isEmailAllowlisted(persona.firmId, null)
  const db = tryCreateCiceronAdminClient()

  let publishedForClients = 2
  let approvedAndSent = 1
  let deadlinesConfirmed = 2
  let reviewTurnaroundLabel = '14 h (mediana, datos de demostración)'

  if (db) {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: events } = await db
      .from('events')
      .select('name, properties')
      .eq('firm_id', persona.firmId)
      .gte('occurred_at', weekAgo)
      .in('name', ['draft_created', 'delivery_confirmed', 'deadline_confirmed', 'review_decided'])

    const rows = Array.isArray(events) ? events : []
    publishedForClients = rows.filter((e) => (e as { name: string }).name === 'draft_created').length
    approvedAndSent = rows.filter(
      (e) =>
        (e as { name: string }).name === 'delivery_confirmed' &&
        ((e as { properties?: { output_type?: string } }).properties?.output_type ===
          'client_alert')
    ).length
    deadlinesConfirmed = rows.filter(
      (e) => (e as { name: string }).name === 'deadline_confirmed'
    ).length

    const { data: turn } = await db
      .from('metric_review_turnaround_weekly')
      .select('median_seconds_or_null, sample_size')
      .eq('firm_id', persona.firmId)
      .order('week_start', { ascending: false })
      .limit(1)
    if (Array.isArray(turn) && turn[0]) {
      const sec = (turn[0] as { median_seconds_or_null: number | null }).median_seconds_or_null
      const n = (turn[0] as { sample_size: number }).sample_size
      if (sec != null && n >= 3) {
        reviewTurnaroundLabel =
          sec < 3600
            ? `${Math.round(sec / 60)} min (mediana, n=${n})`
            : `${(sec / 3600).toFixed(1)} h (mediana, n=${n})`
      } else {
        reviewTurnaroundLabel = '— (muestra insuficiente)'
      }
    }

    await db.from('briefing_previews').upsert(
      {
        firm_id: persona.firmId,
        user_id: persona.id,
        preview_date: todayCdmx(),
        kind: 'weekly_socio',
        line_count: 4,
        empty_state: false,
        reviewed_count: 0,
        payload: {
          publishedForClients,
          approvedAndSent,
          deadlinesConfirmed,
        },
        email_simulated: !allowlisted,
        is_demo: true,
      },
      { onConflict: 'firm_id,user_id,preview_date,kind' }
    )
  }

  const lines: BriefingLine[] = [
    {
      kind: 'match',
      text: `Publicado para sus clientes: ${publishedForClients}`,
      href: '/ciceron/monitor-dof',
    },
    {
      kind: 'review',
      text: `Aprobado y enviado: ${approvedAndSent}`,
      href: '/ciceron/revision',
    },
    {
      kind: 'deadline',
      text: `Plazos confirmados: ${deadlinesConfirmed}`,
      href: '/ciceron/expedientes/calendario',
    },
    {
      kind: 'review',
      text: `Tiempo de revisión: ${reviewTurnaroundLabel}`,
      href: '/ciceron/revision/auditoria',
    },
  ]

  await recordCiceronEvent({
    name: 'briefing_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { kind: 'weekly_socio', is_demo: true },
  })

  return {
    publishedForClients,
    approvedAndSent,
    deadlinesConfirmed,
    reviewTurnaroundLabel,
    lines,
    emailSimulated: !allowlisted,
    generatedAt: new Date().toISOString(),
  }
}
