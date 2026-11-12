/**
 * Typed product analytics for Cicéron (Prompt 8).
 * One helper — never put client names, document text, or question text in properties.
 * Inserts via service-role RPC ciceron.record_product_event (or direct insert in tests).
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

/** Property keys allowed in events.properties (mirrors SQL allow-list in 314). */
export const ALLOWED_EVENT_PROPERTY_KEYS = [
  'room',
  'surface',
  'kind',
  'verdict',
  'reason_code',
  'output_type',
  'decision',
  'simulated',
  'invite_role',
  'source_kind',
  'source_id',
  'match_id',
  'matter_id',
  'client_id',
  'watch_profile_id',
  'is_demo',
] as const

export type AllowedEventPropertyKey = (typeof ALLOWED_EVENT_PROPERTY_KEYS)[number]

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

/** Same pattern as ciceron.record_product_event in 314 (string property values). */
export const EVENT_PROPERTY_STRING_RE = /^[A-Za-z0-9_:.-]{1,120}$/

const safeCode = z.string().regex(EVENT_PROPERTY_STRING_RE)
const safeCodeOpt = safeCode.optional()

const demoFlag = z.object({ is_demo: z.boolean().optional() }).strict()

export const eventPayloadSchemas = {
  session_started: demoFlag
    .extend({
      surface: z.enum(['hoy', 'invite', 'admin']).optional(),
    })
    .strict(),
  room_opened: demoFlag
    .extend({
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
    })
    .strict(),
  briefing_opened: demoFlag
    .extend({
      kind: z.enum(['morning', 'weekly_socio']),
    })
    .strict(),
  alert_opened: demoFlag
    .extend({
      match_id: safeCodeOpt,
    })
    .strict(),
  alert_feedback: demoFlag
    .extend({
      verdict: z.enum(['relevant', 'not_relevant']),
      match_id: safeCodeOpt,
      reason_code: safeCodeOpt,
    })
    .strict(),
  source_opened: demoFlag
    .extend({
      source_kind: z.enum(['dof', 'case_file', 'other']),
      source_id: safeCodeOpt,
    })
    .strict(),
  research_asked: demoFlag
    .extend({
      matter_id: safeCodeOpt,
    })
    .strict(),
  research_feedback: demoFlag
    .extend({
      verdict: z.enum(['useful', 'incorrect', 'incomplete']),
    })
    .strict(),
  draft_created: demoFlag
    .extend({
      output_type: safeCode,
      matter_id: safeCodeOpt,
    })
    .strict(),
  review_decided: demoFlag
    .extend({
      decision: z.enum(['approved', 'approved_with_edits', 'rejected', 'reassigned']),
      output_type: safeCodeOpt,
    })
    .strict(),
  delivery_confirmed: demoFlag
    .extend({
      output_type: safeCode,
      simulated: z.boolean(),
    })
    .strict(),
  deadline_confirmed: demoFlag
    .extend({
      matter_id: safeCodeOpt,
    })
    .strict(),
  watch_profile_created: demoFlag
    .extend({
      client_id: safeCode,
      watch_profile_id: safeCodeOpt,
    })
    .strict(),
  watch_profile_edited: demoFlag
    .extend({
      watch_profile_id: safeCode,
      reason_code: safeCodeOpt,
    })
    .strict(),
  saved_view_created: demoFlag
    .extend({
      room: z.enum(['monitor-dof', 'expedientes', 'calendario']),
    })
    .strict(),
  invite_redeemed: demoFlag
    .extend({
      invite_role: z.enum(['socio', 'asociado', 'pasante', 'admin']).optional(),
    })
    .strict(),
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

export function assertAllowedPropertyKeys(
  properties: Record<string, unknown>
): { ok: true } | { ok: false; key: string } {
  for (const key of Object.keys(properties)) {
    if ((FORBIDDEN_EVENT_PROPERTY_KEYS as readonly string[]).includes(key)) {
      return { ok: false, key }
    }
    if (!(ALLOWED_EVENT_PROPERTY_KEYS as readonly string[]).includes(key)) {
      return { ok: false, key }
    }
  }
  return { ok: true }
}

/** @deprecated use assertAllowedPropertyKeys */
export function assertNoForbiddenKeys(
  properties: Record<string, unknown>
): { ok: true } | { ok: false; key: string } {
  return assertAllowedPropertyKeys(properties)
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
  const allowed = assertAllowedPropertyKeys(properties as Record<string, unknown>)
  if (!allowed.ok) {
    return { ok: false, message: `forbidden property: ${allowed.key}` }
  }
  const schema = eventPayloadSchemas[name]
  const parsed = schema.safeParse(properties)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.message }
  }
  // Belt-and-suspenders: every string value must match SQL allow-list regex
  // (including enum fields), so invalid codes never reach the RPC silently.
  for (const [key, value] of Object.entries(parsed.data as Record<string, unknown>)) {
    if (typeof value === 'string' && !EVENT_PROPERTY_STRING_RE.test(value)) {
      return { ok: false, message: `invalid event property value for ${key}` }
    }
  }
  return { ok: true, properties: parsed.data as CiceronEventPayloadMap[N] }
}

type InsertClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }
  rpc?: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

/**
 * Validate + insert one typed event via service-role RPC when available.
 * Best-effort; never throws for analytics failures.
 */
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

  if (typeof client.rpc === 'function') {
    const { data, error } = await client.rpc('record_product_event', {
      p_name: input.name,
      p_firm_id: input.firmId,
      p_user_id: input.userId,
      p_properties: parsed.properties,
      p_occurred_at: input.occurredAt ?? new Date().toISOString(),
      p_id: input.id ?? null,
    })
    if (error) return { ok: false, reason: 'db', message: error.message }
    return {
      ok: true,
      id: typeof data === 'string' ? data : input.id ?? null,
    }
  }

  // Test doubles / pre-314 clients: direct service-role insert only.
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
