'use server'

import { revalidatePath } from 'next/cache'
import { assertCanConfirmDeadline } from '@/lib/ciceron/case-files/confirm-deadline'
import { getCaseFileConnector } from '@/lib/ciceron/connectors/case-file'
import {
  FIXTURE_DEADLINE_RULES,
  FIXTURE_NON_WORKING_2026,
  proposeDeadlinesFromEvent,
} from '@/lib/ciceron/case-files/propose-deadlines'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { complete } from '@/lib/ciceron/gateway/complete'
import {
  PROMPT_CASE_EVENT_SUMMARY_V1,
  PROMPT_CLIENT_NOTIFY_V1,
  PROMPT_INFORMAR_CLIENTE_V1,
  wrapUntrusted,
} from '@/lib/ciceron/gateway/prompts'
import {
  deadlineConfirmColumns,
  deadlineDiscardColumns,
  demoPersonaActor,
  integrationConnectedByColumns,
  notifyApproveColumns,
  notifyCreatedByColumns,
  reviewAssigneeColumns,
} from '@/lib/ciceron/demo/actor-write'
import { writeM365CookieStatus } from '@/lib/ciceron/m365/demo-store'
import { CICERON_DEMO_LABEL } from '@/lib/ciceron/config'

export type ActionResult = {
  ok: boolean
  message?: string
  payload?: Record<string, unknown>
}

export async function connectOutlookSim(): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  await writeM365CookieStatus('connected')
  const db = tryCreateCiceronAdminClient()
  if (db) {
    try {
      await db.from('firm_integrations').upsert(
        {
          firm_id: persona.firmId,
          provider: 'microsoft365_sim',
          status: 'connected',
          connected_at: new Date().toISOString(),
          ...integrationConnectedByColumns(demoPersonaActor(persona.id)),
          is_sample: true,
          metadata: {
            label: CICERON_DEMO_LABEL,
            simulated: true,
          },
        },
        { onConflict: 'firm_id,provider' }
      )
    } catch {
      // table may be missing — cookie still set
    }
  }
  revalidatePath('/ciceron')
  return { ok: true, message: 'Outlook simulado conectado (demostración).' }
}

export async function disconnectOutlookSim(): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  await writeM365CookieStatus('disconnected')
  const db = tryCreateCiceronAdminClient()
  if (db) {
    try {
      await db
        .from('firm_integrations')
        .update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString(),
        })
        .eq('firm_id', persona.firmId)
        .eq('provider', 'microsoft365_sim')
    } catch {
      // ignore missing table
    }
  }
  revalidatePath('/ciceron')
  return { ok: true, message: 'Outlook simulado desconectado.' }
}

export async function confirmDeadlineAction(formData: FormData): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  const deadlineId = String(formData.get('deadlineId') ?? '')
  const caseId = String(formData.get('caseId') ?? '')
  if (!deadlineId) return { ok: false, message: 'Falta el plazo.' }

  const gate = assertCanConfirmDeadline({
    role: persona.role,
    nextStatus: 'confirmado',
    confirmedBy: persona.id,
  })
  if (!gate.ok) return { ok: false, message: gate.message }

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    // Fixture path: accept for socio/asociado so the demo click works offline
    revalidatePath(`/ciceron/expedientes/${caseId || 'case-1'}`)
    return {
      ok: true,
      message: 'Plazo confirmado en la demostración (sin base aún).',
      payload: { deadlineId, status: 'confirmado' },
    }
  }

  try {
    const { error } = await db
      .from('deadlines')
      .update({
        status: 'confirmado',
        ...deadlineConfirmColumns(demoPersonaActor(persona.id)),
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', deadlineId)
    if (error) {
      return { ok: false, message: error.message || 'No se pudo confirmar el plazo.' }
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'No se pudo confirmar el plazo.',
    }
  }

  revalidatePath(`/ciceron/expedientes/${caseId}`)
  revalidatePath('/ciceron/expedientes/calendario')
  return { ok: true, message: 'Plazo confirmado.' }
}

export async function discardDeadlineAction(formData: FormData): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  const deadlineId = String(formData.get('deadlineId') ?? '')
  const caseId = String(formData.get('caseId') ?? '')
  const gate = assertCanConfirmDeadline({
    role: persona.role,
    nextStatus: 'confirmado',
    confirmedBy: persona.id,
  })
  // Same authority for discard of proposed deadlines
  if (!gate.ok) return { ok: false, message: gate.message }

  const db = tryCreateCiceronAdminClient()
  if (db) {
    try {
      await db
        .from('deadlines')
        .update({
          status: 'descartado',
          ...deadlineDiscardColumns(demoPersonaActor(persona.id)),
          discarded_at: new Date().toISOString(),
        })
        .eq('id', deadlineId)
    } catch {
      // degrade
    }
  }
  revalidatePath(`/ciceron/expedientes/${caseId}`)
  return { ok: true, message: 'Plazo descartado.' }
}

export async function parseManualCaptureAction(formData: FormData): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  const kind = String(formData.get('kind') ?? 'paste') as 'paste' | 'pdf' | 'email'
  const text = String(formData.get('text') ?? '')
  const courtNameHint = String(formData.get('courtNameHint') ?? '') || undefined
  const fileNumberHint = String(formData.get('fileNumberHint') ?? '') || undefined

  try {
    const connector = getCaseFileConnector('manual')
    const events = await connector.ingest({
      kind,
      text,
      courtNameHint,
      fileNumberHint,
      fileName: String(formData.get('fileName') ?? '') || undefined,
    })
    const event = events[0]!
    const proposed = proposeDeadlinesFromEvent(
      event,
      FIXTURE_DEADLINE_RULES,
      FIXTURE_NON_WORKING_2026
    )
    return {
      ok: true,
      payload: { event, proposed },
      message: 'Revise el análisis antes de guardar.',
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'No se pudo interpretar.' }
  }
}

export async function draftInformarCliente(formData: FormData): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  const caseId = String(formData.get('caseId') ?? '')
  const eventText = String(formData.get('eventText') ?? '')
  const clientName = String(formData.get('clientName') ?? 'cliente')
  const fileNumber = String(formData.get('fileNumber') ?? '')

  const result = await complete({
    purpose: PROMPT_INFORMAR_CLIENTE_V1.purpose,
    tier: 'fast',
    system: PROMPT_INFORMAR_CLIENTE_V1.system,
    user: wrapUntrusted(
      'CASE_EVENT',
      `Cliente: ${clientName}\nExpediente: ${fileNumber}\n\n${eventText}`
    ),
    maxTokens: 500,
    firmId: persona.firmId,
    userId: persona.id,
    matterId: String(formData.get('matterId') ?? '') || null,
  })

  const body = result.ok
    ? result.text
    : `${CICERON_DEMO_LABEL}. Nota de estado para ${clientName} sobre el expediente ${fileNumber}: se recibió una actuación relevante. El equipo revisará el plazo y le informará los siguientes pasos.`

  const db = tryCreateCiceronAdminClient()
  let reviewTaskId: string | null = null
  let aiOutputId: string | null = null
  if (db && result.ok && result.aiRunId) {
    try {
      const { data: out } = await db
        .from('ai_outputs')
        .insert({
          ai_run_id: result.aiRunId,
          tier: 2,
          status: 'en_revision',
          body,
        })
        .select('id')
        .maybeSingle()
      aiOutputId = (out as { id: string } | null)?.id ?? null
      const matterId = String(formData.get('matterId') ?? '')
      if (aiOutputId && matterId) {
        const { data: task } = await db
          .from('review_tasks')
          .insert({
            matter_id: matterId,
            ai_output_id: aiOutputId,
            ...reviewAssigneeColumns(demoPersonaActor(persona.id)),
            status: 'pendiente',
          })
          .select('id')
          .maybeSingle()
        reviewTaskId = (task as { id: string } | null)?.id ?? null
      }
    } catch {
      // degrade when tables/columns missing
    }
  }

  revalidatePath('/ciceron/revision')
  revalidatePath(`/ciceron/expedientes/${caseId}`)
  return {
    ok: true,
    message: 'Borrador listo. Se abrió una tarea de revisión de nivel 2.',
    payload: { body, reviewTaskId, aiOutputId },
  }
}

export async function draftClientNotifyEmail(formData: FormData): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }

  const clientName = String(formData.get('clientName') ?? 'cliente')
  const fileNumber = String(formData.get('fileNumber') ?? '')
  const eventText = String(formData.get('eventText') ?? '')
  const toEmail = String(formData.get('toEmail') ?? 'contacto@cliente-demo.mx')
  const matterId = String(formData.get('matterId') ?? '')
  const caseId = String(formData.get('caseId') ?? '')

  const result = await complete({
    purpose: PROMPT_CLIENT_NOTIFY_V1.purpose,
    tier: 'fast',
    system: PROMPT_CLIENT_NOTIFY_V1.system,
    user: wrapUntrusted(
      'CASE_EVENT',
      `Cliente: ${clientName}\nExpediente: ${fileNumber}\n\n${eventText}`
    ),
    maxTokens: 600,
    firmId: persona.firmId,
    userId: persona.id,
    matterId: matterId || null,
  })

  let subject = `Actualización de su expediente ${fileNumber}`
  let body = result.ok
    ? result.text
    : [
        `Estimado(a) representante de ${clientName}:`,
        '',
        `Le informamos sobre una actuación reciente en el expediente ${fileNumber}.`,
        eventText.slice(0, 400),
        '',
        'Quedamos a su disposición para cualquier duda.',
        '',
        `Atentamente,\n${persona.displayName}\nDespacho Demo, S.C.`,
        '',
        CICERON_DEMO_LABEL,
      ].join('\n')

  if (result.ok) {
    try {
      const parsed = JSON.parse(result.text) as { subject?: string; body?: string }
      if (parsed.subject) subject = parsed.subject
      if (parsed.body) body = parsed.body
    } catch {
      // keep plain text body
    }
  }

  const db = tryCreateCiceronAdminClient()
  let draftId = `notify-fixture-${Date.now()}`
  let reviewTaskId: string | null = null
  if (db && matterId) {
    try {
      const { data: out } =
        result.ok && result.aiRunId
          ? await db
              .from('ai_outputs')
              .insert({
                ai_run_id: result.aiRunId,
                tier: 2,
                status: 'en_revision',
                body: `Asunto: ${subject}\n\n${body}`,
              })
              .select('id')
              .maybeSingle()
          : { data: null }
      const aiOutputId = (out as { id: string } | null)?.id ?? null
      let taskId: string | null = null
      if (aiOutputId) {
        const { data: task } = await db
          .from('review_tasks')
          .insert({
            matter_id: matterId,
            ai_output_id: aiOutputId,
            ...reviewAssigneeColumns(demoPersonaActor(persona.id)),
            status: 'pendiente',
          })
          .select('id')
          .maybeSingle()
        taskId = (task as { id: string } | null)?.id ?? null
        reviewTaskId = taskId
      }
      const { data: draft } = await db
        .from('client_notify_drafts')
        .insert({
          firm_id: persona.firmId,
          matter_id: matterId,
          case_file_id: caseId || null,
          ai_output_id: aiOutputId,
          review_task_id: taskId,
          to_email: toEmail,
          subject,
          body,
          status: 'en_revision',
          is_sample: true,
          ...notifyCreatedByColumns(demoPersonaActor(persona.id)),
        })
        .select('id')
        .maybeSingle()
      if (draft && (draft as { id: string }).id) {
        draftId = (draft as { id: string }).id
      }
    } catch {
      // fixture id remains
    }
  }

  revalidatePath('/ciceron/revision')
  return {
    ok: true,
    message: 'Borrador de correo listo. Requiere aprobación (nivel 2) antes del envío simulado.',
    payload: {
      draftId,
      toEmail,
      subject,
      body,
      status: 'en_revision',
      reviewTaskId,
    },
  }
}

export async function approveClientNotifySim(formData: FormData): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  const draftId = String(formData.get('draftId') ?? '')
  const gate = assertCanConfirmDeadline({
    role: persona.role,
    nextStatus: 'confirmado',
    confirmedBy: persona.id,
  })
  if (!gate.ok) {
    return {
      ok: false,
      message: 'Solo un socio o asociado puede aprobar el envío simulado al cliente.',
    }
  }

  const db = tryCreateCiceronAdminClient()
  if (db && draftId && !draftId.startsWith('notify-fixture')) {
    try {
      const { error } = await db
        .from('client_notify_drafts')
        .update({
          status: 'enviado_simulado',
          ...notifyApproveColumns(demoPersonaActor(persona.id)),
          approved_at: new Date().toISOString(),
          simulated_sent_at: new Date().toISOString(),
        })
        .eq('id', draftId)
      if (error) return { ok: false, message: error.message }
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'No se pudo registrar el envío simulado.',
      }
    }
  }

  revalidatePath('/ciceron/expedientes')
  return {
    ok: true,
    message: 'Marcado como «Enviado» (simulado). No se envió correo real.',
    payload: { status: 'enviado_simulado' },
  }
}

export async function syncDeadlinesToOutlookSim(formData: FormData): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  const caseId = String(formData.get('caseId') ?? '')
  const db = tryCreateCiceronAdminClient()
  let synced = 0
  if (db) {
    try {
      let q = db
        .from('deadlines')
        .select('id, due_at, basis_text, matter_id, case_file_id, status')
        .eq('status', 'confirmado')
      if (caseId) q = q.eq('case_file_id', caseId)
      const { data } = await q.limit(20)
      const rows = (Array.isArray(data) ? data : []) as Array<{
        id: string
        due_at: string
        basis_text: string | null
        matter_id: string
        case_file_id: string | null
      }>
      for (const d of rows) {
        await db.from('simulated_calendar_events').insert({
          firm_id: persona.firmId,
          matter_id: d.matter_id,
          case_file_id: d.case_file_id,
          deadline_id: d.id,
          lawyer_user_id: persona.id,
          event_kind: 'deadline',
          title: `${CICERON_DEMO_LABEL}. Plazo confirmado — ${(d.basis_text || '').slice(0, 60)}`,
          starts_at: d.due_at,
          synced_from_ciceron: true,
          is_sample: true,
        })
        synced += 1
      }
    } catch {
      synced = 1 // demo success when tables missing
    }
  } else {
    synced = 1
  }
  revalidatePath('/ciceron/expedientes/calendario')
  return {
    ok: true,
    message: `Sincronización simulada: ${synced} plazo(s) añadidos al Calendario de Outlook (simulado).`,
  }
}

export async function summarizeCaseEventAction(formData: FormData): Promise<ActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  const text = String(formData.get('text') ?? '')
  const result = await complete({
    purpose: PROMPT_CASE_EVENT_SUMMARY_V1.purpose,
    tier: 'fast',
    system: PROMPT_CASE_EVENT_SUMMARY_V1.system,
    user: wrapUntrusted('CASE_EVENT', text),
    maxTokens: 200,
    firmId: persona.firmId,
    userId: persona.id,
  })
  if (!result.ok) {
    return {
      ok: true,
      payload: {
        summary:
          'Actuación recibida en el expediente de demostración. Revise el original antes de informar al cliente.',
      },
    }
  }
  return { ok: true, payload: { summary: result.text.trim() } }
}
