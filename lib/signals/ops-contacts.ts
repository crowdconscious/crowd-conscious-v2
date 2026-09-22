/**
 * Author-suggested contacts for Señal ops packets.
 *
 * These are NEVER used as Resend To: for institutions. They appear in the
 * ops email as "Destinatarios / canales sugeridos por el autor" so Francisco
 * can forward / apply social pressure manually.
 */

import { z } from 'zod'

export const OPS_ROUTING_MODES = ['crowd_conscious', 'author_provided'] as const
export type OpsRoutingMode = (typeof OPS_ROUTING_MODES)[number]

export const AUTHOR_CONTACT_KINDS = [
  'email',
  'phone',
  'whatsapp',
  'instagram',
  'x',
] as const
export type AuthorContactKind = (typeof AUTHOR_CONTACT_KINDS)[number]

export const MAX_AUTHOR_SUGGESTED_CONTACTS = 5

const emailValueSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(320)

/** Digits / + only; 8–20 significant digits after strip. */
function normalizePhoneLike(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/[^\d+]/g, '')
  const significant = digits.replace(/\D/g, '')
  if (significant.length < 8 || significant.length > 20) return null
  return digits.startsWith('+') ? `+${significant}` : significant
}

/** Strip @ and URL noise; keep a–z 0–9 _ . */
function normalizeSocialHandle(raw: string): string | null {
  let v = raw.trim()
  if (!v) return null
  v = v.replace(/^https?:\/\/(www\.)?(instagram\.com|x\.com|twitter\.com)\//i, '')
  v = v.replace(/^@/, '').split(/[/?#]/)[0] ?? ''
  v = v.trim().toLowerCase()
  if (!/^[a-z0-9._]{1,30}$/.test(v)) return null
  return v
}

const contactLabelSchema = z
  .string()
  .trim()
  .max(80)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null))

const authorSuggestedContactSchema = z
  .object({
    kind: z.enum(AUTHOR_CONTACT_KINDS),
    value: z.string().trim().min(1).max(320),
    label: contactLabelSchema,
  })
  .superRefine((row, ctx) => {
    if (row.kind === 'email') {
      const parsed = emailValueSchema.safeParse(row.value)
      if (!parsed.success) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Invalid email',
        })
      }
      return
    }
    if (row.kind === 'phone' || row.kind === 'whatsapp') {
      if (!normalizePhoneLike(row.value)) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Phone must be 8–20 digits',
        })
      }
      return
    }
    if (!normalizeSocialHandle(row.value)) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Invalid social handle',
      })
    }
  })
  .transform((row) => {
    if (row.kind === 'email') {
      return {
        kind: row.kind,
        value: emailValueSchema.parse(row.value),
        label: row.label,
      }
    }
    if (row.kind === 'phone' || row.kind === 'whatsapp') {
      return {
        kind: row.kind,
        value: normalizePhoneLike(row.value)!,
        label: row.label,
      }
    }
    return {
      kind: row.kind,
      value: normalizeSocialHandle(row.value)!,
      label: row.label,
    }
  })

export type AuthorSuggestedContact = z.infer<typeof authorSuggestedContactSchema>

export const authorSuggestedContactsSchema = z
  .array(authorSuggestedContactSchema)
  .max(MAX_AUTHOR_SUGGESTED_CONTACTS)

export const opsRoutingFieldsSchema = z
  .object({
    ops_routing_mode: z.enum(OPS_ROUTING_MODES).optional().default('crowd_conscious'),
    author_suggested_contacts: authorSuggestedContactsSchema
      .optional()
      .default([]),
  })
  .superRefine((val, ctx) => {
    if (val.ops_routing_mode === 'author_provided') {
      if (val.author_suggested_contacts.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['author_suggested_contacts'],
          message:
            'author_suggested_contacts requires at least one contact when ops_routing_mode=author_provided',
        })
      }
    }
  })
  .transform((val) => {
    if (val.ops_routing_mode === 'crowd_conscious') {
      return {
        ops_routing_mode: val.ops_routing_mode,
        author_suggested_contacts: [] as AuthorSuggestedContact[],
      }
    }
    return val
  })

export type OpsRoutingFields = z.infer<typeof opsRoutingFieldsSchema>

/** Default ops inboxes — Francisco personally forwards while alcaldía contacts are gathered. */
export const DEFAULT_SIGNALS_OPS_RECIPIENTS = [
  'francisco@crowdconscious.app',
  'comunidad@crowdconscious.app',
] as const

/**
 * SIGNALS_OPS_EMAIL_ENABLED defaults true when Resend is usable.
 * Set to 'false' to disable ops packets without killing other Signal mail.
 */
export function isSignalsOpsEmailEnabled(): boolean {
  if (process.env.SIGNALS_OPS_EMAIL_ENABLED === 'false') return false
  if (process.env.RESEND_ENABLED === 'false') return false
  return true
}

export function resolveSignalsOpsRecipients(): string[] {
  const raw = process.env.SIGNALS_OPS_EMAIL_TO?.trim()
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes('@'))
  }
  return [...DEFAULT_SIGNALS_OPS_RECIPIENTS]
}

export function kindLabelEs(kind: AuthorContactKind): string {
  switch (kind) {
    case 'email':
      return 'Correo'
    case 'phone':
      return 'Teléfono'
    case 'whatsapp':
      return 'WhatsApp'
    case 'instagram':
      return 'Instagram'
    case 'x':
      return 'X / Twitter'
  }
}
