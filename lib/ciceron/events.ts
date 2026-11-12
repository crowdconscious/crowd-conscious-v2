/**
 * Typed product analytics for Cicéron (Prompt 8).
 * One helper — never put client names, document text, or question text in properties.
 */

import { z } from 'zod'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'

export const CICERON_EVENT_NAMES = [
  'session_started',
  'room_opened',
  'briefing_opened',
  'alert_opened',
  'alert_feedback',
  'source_opened',
  'research_asked',
  'research_feedback',
  'draft_created',
  'review_decided',
  'delivery_confirmed',
  'deadline_confirmed',
  'watch_profile_created',
  'watch_profile_edited',
  'saved_view_created',
  'invite_redeemed',
] as const

export type CiceronEventName = (typeof CICERON_EVENT_NAMES)[number]

/** Keys that must never appear in event properties (privacy). */
export const FORBIDDEN_EVENT_PROPERTY_KEYS = [
  'client_name',
  'clientName',
  'display_name',
  'displayName',
  'document_text',
  'documentText',
  'question',
  'question_text',
  'questionText',
  'body',
  'passage',
  'content',
  'text',
  'headline',
  'email',
  'full_name',
  'fullName',
] as const

export type ForbiddenEventPropertyKey = (typeof FORBIDDEN_EVENT_PROPERTY_KEYS)[number]

const demoFlag = z.object({ is_demo: z.boolean().optional() }).strict()

/** Ids may be real UUIDs or short fixture keys in offline demo. */
const idish = z.string().min(1).max(64).optional()

export const eventPayloadSchemas = {
  session_started: demoFlag.extend({
    surface: z.enum(['hoy', 'invite', 'admin']).optional(),
  }).strict(),
  room_opened: demoFlag.extend({
    room: z.enum([
      'hoy',
      'monitor-dof',
      'expedientes',
      'investigacion',
      'revision',
      'clientes',
      'admin-metricas',
      'admin-fuentes',
    ]),
  }).strict(),
  briefing_opened: demoFlag.extend({
    kind: z.enum(['morning', 'weekly_socio']),
  }).strict(),
  alert_opened: demoFlag.extend({
    match_id: idish,
    alert_id: idish,
  }).strict(),
  alert_feedback: demoFlag.extend({
    verdict: z.enum(['relevant', 'not_relevant']),
    match_id: idish,
    alert_id: idish,
    reason_code: z.string().max(80).optional(),
  }).strict(),
  source_opened: demoFlag.extend({
    source_kind: z.enum(['dof', 'case_file', 'other']),
    source_id: z.string().max(120).optional(),
  }).strict(),
  research_asked: demoFlag.extend({
    matter_id: idish,
    research_query_id: idish,
  }).strict(),
  research_feedback: demoFlag.extend({
    verdict: z.enum(['useful', 'incorrect', 'incomplete']),
    research_query_id: idish,
  }).strict(),
  draft_created: demoFlag.extend({
    output_type: z.string().min(1).max(64),
    matter_id: idish,
    draft_id: idish,
  }).strict(),
  review_decided: demoFlag.extend({
    decision: z.enum(['approved', 'approved_with_edits', 'rejected', 'reassigned']),
    output_type: z.string().max(64).optional(),
    review_task_id: idish,
  }).strict(),
  delivery_confirmed: demoFlag.extend({
    output_type: z.string().min(1).max(64),
    simulated: z.boolean(),
    delivery_id: idish,
  }).strict(),
  deadline_confirmed: demoFlag.extend({
    matter_id: idish,
    deadline_id: idish,
  }).strict(),
  watch_profile_created: demoFlag.extend({
    client_id: z.string().min(1).max(64),
    watch_profile_id: idish,
  }).strict(),
  watch_profile_edited: demoFlag.extend({
    watch_profile_id: z.string().min(1).max(64),
    reason_code: z.string().max(80).optional(),
  }).strict(),
  saved_view_created: demoFlag.extend({
    room: z.enum(['monitor-dof', 'expedientes', 'calendario']),
    saved_view_id: idish,
  }).strict(),
  invite_redeemed: demoFlag.extend({
    invite_role: z.enum(['socio', 'asociado', 'pasante', 'admin']).optional(),
  }).strict(),
} as const

export type CiceronEventPayloadMap = {
  [K in CiceronEventName]: z.infer<(typeof eventPayloadSchemas)[K]>
}

export type CiceronEventInput<N extends CiceronEventName = CiceronEventName> = {
  name: N
  firmId: string
  userId: string | null
  properties: CiceronEventPayloadMap[N]
  occurredAt?: string
  id?: string
}

export type RecordEventResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: 'forbidden_key' | 'invalid_payload' | 'db'; message: string }

export function assertNoForbiddenKeys(
  properties: Record<string, unknown>
): { ok: true } | { ok: false; key: string } {
  for (const key of Object.keys(properties)) {
    if ((FORBIDDEN_EVENT_PROPERTY_KEYS as readonly string[]).includes(key)) {
      return { ok: false, key }
    }
  }
  return { ok: true }
}

export function parseEventProperties<N extends CiceronEventName>(
  name: N,
  properties: unknown
):
  | { ok: true; properties: CiceronEventPayloadMap[N] }
  | { ok: false; message: string } {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return { ok: false, message: 'properties must be an object' }
  }
  const forbidden = assertNoForbiddenKeys(properties as Record<string, unknown>)
  if (!forbidden.ok) {
    return { ok: false, message: `forbidden property: ${forbidden.key}` }
  }
  const schema = eventPayloadSchemas[name]
  const parsed = schema.safeParse(properties)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.message }
  }
  return { ok: true, properties: parsed.data as CiceronEventPayloadMap[N] }
}

type InsertClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }
}

/** Validate + insert one typed event. Best-effort; never throws for analytics failures. */
export async function recordCiceronEvent<N extends CiceronEventName>(
  input: CiceronEventInput<N>,
  db?: InsertClient | null
): Promise<RecordEventResult> {
  const parsed = parseEventProperties(input.name, input.properties)
  if (!parsed.ok) {
    const forbidden = parsed.message.startsWith('forbidden')
    return {
      ok: false,
      reason: forbidden ? 'forbidden_key' : 'invalid_payload',
      message: parsed.message,
    }
  }

  const client = db ?? tryCreateCiceronAdminClient()
  if (!client) {
    return { ok: false, reason: 'db', message: 'no database client' }
  }

  const row: Record<string, unknown> = {
    name: input.name,
    firm_id: input.firmId,
    user_id: input.userId,
    properties: parsed.properties,
  }
  if (input.occurredAt) row.occurred_at = input.occurredAt
  if (input.id) row.id = input.id

  const { error } = await client.from('events').insert(row)
  if (error) return { ok: false, reason: 'db', message: error.message }
  return { ok: true, id: input.id ?? null }
}
