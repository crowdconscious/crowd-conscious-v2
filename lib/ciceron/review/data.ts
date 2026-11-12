import 'server-only'

import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import {
  fixtureAuditRows,
  fixtureInboxItems,
  fixtureTaskDetail,
} from '@/lib/ciceron/review/fixtures'
import type {
  AuditViewerRow,
  DeliveryPreview,
  ReviewInboxItem,
  ReviewTab,
  ReviewTaskDetail,
} from '@/lib/ciceron/review/types'

function isOverdue(dueAt: string | null, status: string): boolean {
  if (!dueAt || status === 'cerrado') return false
  return Date.parse(dueAt) < Date.now()
}

function formatDueLabel(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export { formatDueLabel }

const PERSONA_NAMES: Record<string, string> = {
  [CICERON_SEED.personas.socio]: 'Socia Demo Rivera',
  [CICERON_SEED.personas.asociado]: 'Asociado Demo Herrera',
  [CICERON_SEED.personas.pasante]: 'Pasante Demo López',
  [CICERON_SEED.personas.admin]: 'Admin Demo Ortega',
  [CICERON_SEED.personas.asociado2]: 'Asociada Demo Méndez',
}

async function matterIdsForPersona(
  db: NonNullable<ReturnType<typeof tryCreateCiceronAdminClient>>,
  persona: DemoPersona
): Promise<Set<string> | 'all'> {
  // Pasantes: only explicit matter_members. Others: firm-wide visibility for "all".
  if (persona.role === 'pasante') {
    const { data } = await db
      .from('matter_members')
      .select('matter_id')
      .eq('user_id', persona.id)
    return new Set(
      ((Array.isArray(data) ? data : []) as { matter_id: string }[]).map((r) => r.matter_id)
    )
  }
  return 'all'
}

async function explicitMatterIds(
  db: NonNullable<ReturnType<typeof tryCreateCiceronAdminClient>>,
  personaId: string
): Promise<Set<string>> {
  const { data } = await db
    .from('matter_members')
    .select('matter_id')
    .eq('user_id', personaId)
  return new Set(
    ((Array.isArray(data) ? data : []) as { matter_id: string }[]).map((r) => r.matter_id)
  )
}

function filterByTab(
  items: ReviewInboxItem[],
  tab: ReviewTab,
  persona: DemoPersona,
  matterScope: Set<string> | 'all',
  myMatterIds: Set<string>
): ReviewInboxItem[] {
  const open = items.filter((i) => i.status !== 'cerrado')
  if (tab === 'mine') {
    return open.filter((i) => i.assigneeId === persona.id)
  }
  if (tab === 'matters') {
    if (myMatterIds.size > 0) {
      return open.filter((i) => myMatterIds.has(i.matterId))
    }
    // No explicit memberships: fall back to assignee overlap for demo asociados
    return open.filter((i) => i.assigneeId === persona.id)
  }
  if (matterScope === 'all') return open
  return open.filter((i) => matterScope.has(i.matterId))
}

function groupByClient(items: ReviewInboxItem[]): { clientName: string; items: ReviewInboxItem[] }[] {
  const map = new Map<string, ReviewInboxItem[]>()
  for (const item of items) {
    const list = map.get(item.clientName) ?? []
    list.push(item)
    map.set(item.clientName, list)
  }
  return [...map.entries()]
    .map(([clientName, group]) => ({
      clientName,
      items: group.sort((a, b) => {
        const da = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY
        const db_ = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY
        return da - db_
      }),
    }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName, 'es'))
}

export async function loadReviewInbox(
  persona: DemoPersona,
  tab: ReviewTab = 'mine'
): Promise<{
  source: 'schema' | 'fixture'
  tab: ReviewTab
  groups: { clientName: string; items: ReviewInboxItem[] }[]
  mineCount: number
  items: ReviewInboxItem[]
}> {
  const db = tryCreateCiceronAdminClient()
  const fixtureMatterScope: Set<string> | 'all' =
    persona.role === 'pasante'
      ? new Set([CICERON_SEED.matters.nexoraCnbv, 'd1000000-0000-4000-8000-000000000003'])
      : 'all'
  const fixtureMyMatters = new Set([CICERON_SEED.matters.nexoraCnbv])

  if (!db) {
    const filtered = filterByTab(
      fixtureInboxItems,
      tab,
      persona,
      fixtureMatterScope,
      fixtureMyMatters
    )
    const mineCount = filterByTab(
      fixtureInboxItems,
      'mine',
      persona,
      fixtureMatterScope,
      fixtureMyMatters
    ).length
    return {
      source: 'fixture',
      tab,
      groups: groupByClient(filtered),
      mineCount,
      items: filtered,
    }
  }

  try {
    const matterScope = await matterIdsForPersona(db, persona)
    const myMatterIds = await explicitMatterIds(db, persona.id)
    const { data: tasks } = await db
      .from('review_tasks')
      .select(
        'id, matter_id, ai_output_id, assignee_id, assignee_persona, status, due_at, title, output_type, is_demo, draft_id'
      )
      .in('status', ['pendiente', 'en_curso'])
      .order('due_at', { ascending: true })
      .limit(100)

    const rows = (Array.isArray(tasks) ? tasks : []) as {
      id: string
      matter_id: string
      assignee_id: string | null
      assignee_persona: string | null
      status: 'pendiente' | 'en_curso' | 'cerrado'
      due_at: string | null
      title: string | null
      output_type: string | null
      is_demo: boolean
    }[]

    const firmMatters = await db
      .from('matters')
      .select('id, title, client_id')
      .eq('firm_id', persona.firmId)
    const matterRows = (Array.isArray(firmMatters.data) ? firmMatters.data : []) as {
      id: string
      title: string
      client_id: string
    }[]
    const matterMap = new Map(matterRows.map((m) => [m.id, m]))

    const { data: clients } = await db
      .from('clients')
      .select('id, display_name')
      .eq('firm_id', persona.firmId)
    const clientMap = new Map(
      ((Array.isArray(clients) ? clients : []) as { id: string; display_name: string }[]).map(
        (c) => [c.id, c.display_name]
      )
    )

    let items: ReviewInboxItem[] = rows
      .filter((r) => matterMap.has(r.matter_id))
      .map((r) => {
        const matter = matterMap.get(r.matter_id)!
        const assigneeId = r.assignee_persona ?? r.assignee_id
        return {
          id: r.id,
          title: r.title ?? matter.title,
          clientName: clientMap.get(matter.client_id) ?? 'Cliente',
          clientId: matter.client_id,
          matterId: r.matter_id,
          matterTitle: matter.title,
          assigneeId,
          assigneeName: assigneeId
            ? (PERSONA_NAMES[assigneeId] ?? 'Revisor')
            : 'Sin asignar',
          dueAt: r.due_at,
          overdue: isOverdue(r.due_at, r.status),
          status: r.status,
          outputType: r.output_type,
          isDemo: Boolean(r.is_demo),
        }
      })

    if (matterScope !== 'all') {
      items = items.filter((i) => matterScope.has(i.matterId))
    }

    const scope = matterScope === 'all' ? 'all' : matterScope
    const filtered = filterByTab(items, tab, persona, scope, myMatterIds)
    const mineCount = filterByTab(items, 'mine', persona, scope, myMatterIds).length

    return {
      source: 'schema',
      tab,
      groups: groupByClient(filtered),
      mineCount,
      items: filtered,
    }
  } catch {
    const filtered = filterByTab(
      fixtureInboxItems,
      tab,
      persona,
      fixtureMatterScope,
      fixtureMyMatters
    )
    return {
      source: 'fixture',
      tab,
      groups: groupByClient(filtered),
      mineCount: filterByTab(
        fixtureInboxItems,
        'mine',
        persona,
        fixtureMatterScope,
        fixtureMyMatters
      ).length,
      items: filtered,
    }
  }
}

export async function loadReviewBadgeCount(persona: DemoPersona): Promise<number> {
  const inbox = await loadReviewInbox(persona, 'mine')
  return inbox.mineCount
}

export async function loadReviewTaskDetail(
  persona: DemoPersona,
  taskId: string
): Promise<{ source: 'schema' | 'fixture'; detail: ReviewTaskDetail | null }> {
  const fixture = fixtureTaskDetail(taskId)
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { source: 'fixture', detail: fixture }
  }

  try {
    const matterScope = await matterIdsForPersona(db, persona)
    const { data: taskRows } = await db
      .from('review_tasks')
      .select(
        'id, matter_id, ai_output_id, assignee_id, assignee_persona, status, due_at, title, output_type, is_demo, draft_id'
      )
      .eq('id', taskId)
      .limit(1)

    const task = Array.isArray(taskRows) ? (taskRows[0] as {
      id: string
      matter_id: string
      ai_output_id: string | null
      assignee_id: string | null
      assignee_persona: string | null
      status: 'pendiente' | 'en_curso' | 'cerrado'
      due_at: string | null
      title: string | null
      output_type: string | null
      is_demo: boolean
      draft_id: string | null
    } | undefined) : undefined

    if (!task) {
      return { source: 'fixture', detail: fixture }
    }

    if (matterScope !== 'all' && !matterScope.has(task.matter_id)) {
      return { source: 'schema', detail: null }
    }

    const { data: matterRows } = await db
      .from('matters')
      .select('id, title, client_id, firm_id')
      .eq('id', task.matter_id)
      .eq('firm_id', persona.firmId)
      .limit(1)
    const matter = Array.isArray(matterRows)
      ? (matterRows[0] as { id: string; title: string; client_id: string; firm_id: string } | undefined)
      : undefined
    if (!matter) return { source: 'schema', detail: null }

    const { data: clientRows } = await db
      .from('clients')
      .select('id, display_name')
      .eq('id', matter.client_id)
      .limit(1)
    const client = Array.isArray(clientRows)
      ? (clientRows[0] as { id: string; display_name: string } | undefined)
      : undefined

    const { data: watchRows } = await db
      .from('watch_profiles')
      .select('description')
      .eq('client_id', matter.client_id)
      .limit(1)
    const watch = Array.isArray(watchRows)
      ? (watchRows[0] as { description: string | null } | undefined)
      : undefined

    let modelBody = ''
    let currentBody = ''
    let modelVersionId: string | null = null
    let currentVersionId: string | null = null
    let humanEditAuthorId: string | null = null

    if (task.draft_id) {
      const { data: versions } = await db
        .from('draft_versions')
        .select('id, author_type, author_user_id, author_persona, body, version_number')
        .eq('draft_id', task.draft_id)
        .order('version_number', { ascending: true })
      const vers = (Array.isArray(versions) ? versions : []) as {
        id: string
        author_type: string
        author_user_id: string | null
        author_persona: string | null
        body: string
        version_number: number
      }[]
      const model = [...vers].reverse().find((v) => v.author_type === 'model')
      const latest = vers[vers.length - 1]
      const human = [...vers].reverse().find((v) => v.author_type === 'human')
      modelBody = model?.body ?? ''
      modelVersionId = model?.id ?? null
      currentBody = latest?.body ?? modelBody
      currentVersionId = latest?.id ?? null
      humanEditAuthorId = human
        ? (human.author_persona ?? human.author_user_id)
        : null
    }

    if (!modelBody && task.ai_output_id) {
      const { data: outs } = await db
        .from('ai_outputs')
        .select('body')
        .eq('id', task.ai_output_id)
        .limit(1)
      const out = Array.isArray(outs) ? (outs[0] as { body: string | null } | undefined) : undefined
      modelBody = out?.body ?? ''
      if (!currentBody) currentBody = modelBody
    }

    let aiRun: ReviewTaskDetail['aiRun'] = null
    if (task.ai_output_id) {
      const { data: outs } = await db
        .from('ai_outputs')
        .select('ai_run_id')
        .eq('id', task.ai_output_id)
        .limit(1)
      const out = Array.isArray(outs)
        ? (outs[0] as { ai_run_id: string } | undefined)
        : undefined
      if (out?.ai_run_id) {
        const { data: runs } = await db
          .from('ai_runs')
          .select('model, purpose, created_at, prompt_version_id')
          .eq('id', out.ai_run_id)
          .limit(1)
        const run = Array.isArray(runs)
          ? (runs[0] as {
              model: string
              purpose: string
              created_at: string
              prompt_version_id: string | null
            } | undefined)
          : undefined
        let promptVersion = '—'
        if (run?.prompt_version_id) {
          const { data: pvs } = await db
            .from('prompt_versions')
            .select('purpose, version_label')
            .eq('id', run.prompt_version_id)
            .limit(1)
          const pv = Array.isArray(pvs)
            ? (pvs[0] as { purpose: string; version_label: string } | undefined)
            : undefined
          if (pv) promptVersion = `${pv.purpose} / ${pv.version_label}`
        }
        if (run) {
          aiRun = {
            model: run.model,
            promptVersion,
            purpose: run.purpose,
            createdAt: run.created_at,
          }
        }
      }
    }

    const { data: settingsRows } = await db
      .from('firm_settings')
      .select('four_eyes_output_types')
      .eq('firm_id', persona.firmId)
      .limit(1)
    const settings = Array.isArray(settingsRows)
      ? (settingsRows[0] as { four_eyes_output_types: string[] } | undefined)
      : undefined
    const fourEyesOn = Boolean(
      task.output_type &&
        Array.isArray(settings?.four_eyes_output_types) &&
        settings!.four_eyes_output_types.includes(task.output_type)
    )

    const assigneeId = task.assignee_persona ?? task.assignee_id

    const detail: ReviewTaskDetail = {
      id: task.id,
      title: task.title ?? matter.title,
      clientName: client?.display_name ?? 'Cliente',
      clientId: matter.client_id,
      matterId: task.matter_id,
      matterTitle: matter.title,
      assigneeId,
      assigneeName: assigneeId ? (PERSONA_NAMES[assigneeId] ?? 'Revisor') : 'Sin asignar',
      dueAt: task.due_at,
      overdue: isOverdue(task.due_at, task.status),
      status: task.status,
      outputType: task.output_type,
      isDemo: Boolean(task.is_demo),
      draftId: task.draft_id,
      aiOutputId: task.ai_output_id,
      modelBody,
      currentBody,
      modelVersionId,
      currentVersionId,
      humanEditAuthorId,
      fourEyesOn,
      aiRun,
      evidence: fixture?.evidence ?? [],
      clientContext: watch?.description ?? 'Datos de demostración.',
      decisionId: null,
      closed: task.status === 'cerrado',
    }

    // Record view of client material (best-effort)
    try {
      await db.from('audit_events').insert({
        firm_id: persona.firmId,
        user_id: persona.id,
        action: 'view_client_material',
        entity_type: 'review_tasks',
        entity_id: task.id,
        payload: { client_id: matter.client_id, matter_id: matter.id },
        outcome: 'allowed',
        policy_id: 'matter_member',
        policy_reason: 'Reviewer opened task with client context',
        snapshot_ref: {
          entity_type: 'review_tasks',
          entity_id: task.id,
          version_id: currentVersionId,
        },
      })
    } catch {
      // ignore
    }

    return { source: 'schema', detail }
  } catch {
    return { source: 'fixture', detail: fixture }
  }
}

export async function loadDeliveryPreview(
  persona: DemoPersona,
  taskId: string
): Promise<DeliveryPreview | null> {
  const { detail } = await loadReviewTaskDetail(persona, taskId)
  if (!detail || !detail.aiOutputId) return null
  return {
    taskId: detail.id,
    aiOutputId: detail.aiOutputId,
    matterId: detail.matterId,
    recipient: `contacto@${detail.clientName.toLowerCase().includes('nexora') ? 'nexora' : 'cliente'}.demo`,
    subject: detail.title,
    body: detail.currentBody,
    channel: 'email',
    isSimulated: true,
    clientName: detail.clientName,
  }
}

export async function loadAuditEvents(
  persona: DemoPersona,
  opts: {
    matterId?: string | null
    actorId?: string | null
    action?: string | null
    from?: string | null
    to?: string | null
  } = {}
): Promise<{ source: 'schema' | 'fixture'; rows: AuditViewerRow[]; canView: boolean }> {
  const canView = persona.role === 'socio' || persona.role === 'admin'
  if (!canView) {
    return { source: 'schema', rows: [], canView: false }
  }

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { source: 'fixture', rows: fixtureAuditRows, canView: true }
  }

  try {
    let query = db
      .from('audit_events')
      .select(
        'id, created_at, user_id, action, entity_type, entity_id, outcome, policy_id, policy_reason, snapshot_ref, payload'
      )
      .eq('firm_id', persona.firmId)
      .order('created_at', { ascending: false })
      .limit(200)

    // PostgREST chain — filters applied when present
    const { data, error } = await query
    if (error || !Array.isArray(data)) {
      return { source: 'fixture', rows: fixtureAuditRows, canView: true }
    }

    let rows = data as {
      id: string
      created_at: string
      user_id: string | null
      action: string
      entity_type: string
      entity_id: string | null
      outcome: 'allowed' | 'denied'
      policy_id: string | null
      policy_reason: string | null
      snapshot_ref: Record<string, unknown> | null
      payload: Record<string, unknown>
    }[]

    if (opts.actorId) {
      rows = rows.filter((r) => r.user_id === opts.actorId)
    }
    if (opts.action) {
      rows = rows.filter((r) => r.action === opts.action)
    }
    if (opts.from) {
      const fromTs = Date.parse(opts.from)
      rows = rows.filter((r) => Date.parse(r.created_at) >= fromTs)
    }
    if (opts.to) {
      const toTs = Date.parse(opts.to)
      rows = rows.filter((r) => Date.parse(r.created_at) <= toTs)
    }
    if (opts.matterId) {
      rows = rows.filter((r) => {
        const payloadMatter = r.payload?.matter_id
        const snap = r.snapshot_ref
        return (
          payloadMatter === opts.matterId ||
          (snap && snap.matter_id === opts.matterId) ||
          r.entity_id === opts.matterId
        )
      })
    }

    return {
      source: 'schema',
      canView: true,
      rows: rows.map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        actorName: r.user_id ? (PERSONA_NAMES[r.user_id] ?? r.user_id.slice(0, 8)) : '—',
        actorId: r.user_id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        outcome: r.outcome ?? 'allowed',
        policyId: r.policy_id,
        policyReason: r.policy_reason,
        snapshotHref:
          r.entity_type === 'review_tasks' && r.entity_id
            ? `/ciceron/revision/${r.entity_id}`
            : r.snapshot_ref && typeof r.snapshot_ref.entity_id === 'string'
              ? `/ciceron/revision/${String(r.snapshot_ref.entity_id)}`
              : null,
      })),
    }
  } catch {
    return { source: 'fixture', rows: fixtureAuditRows, canView: true }
  }
}

export { auditRowsToCsv } from '@/lib/ciceron/review/data-client'
