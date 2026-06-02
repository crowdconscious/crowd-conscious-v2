import { z } from 'zod'
import {
  SIGNAL_CATEGORIES,
  SIGNAL_POST_TYPES,
  SIGNAL_SEVERITIES,
  SIGNAL_TARGET_KINDS,
} from '@/lib/i18n/citizen-signals'

export const SIGNAL_ROUTING_MODES = ['routed', 'observation'] as const
export type SignalRoutingMode = (typeof SIGNAL_ROUTING_MODES)[number]

const countryCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2}$/, 'country_code must be ISO 3166-1 alpha-2'))

const citySlugSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(2)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'city_slug must be lowercase alphanumeric with optional hyphens'
      )
  )

const signalEvidenceSchema = z.object({
  kind: z.enum(['image', 'pdf', 'link']),
  storage_path: z.string().trim().min(1).max(1024).optional().nullable(),
  external_url: z.string().trim().url().max(2000).optional().nullable(),
  caption: z.string().trim().max(500).optional().nullable(),
})

const sharedCreateFields = {
  post_type: z.enum(SIGNAL_POST_TYPES),
  category: z.enum(SIGNAL_CATEGORIES),
  severity: z.enum(SIGNAL_SEVERITIES),
  title: z.string().trim().min(8).max(160),
  body: z.string().trim().min(20).max(8000),
  language: z.enum(['es', 'en']),
  anonymous_display_mode: z.boolean().optional().default(false),
  anonymous_display_name: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .optional()
    .nullable(),
  evidence: z.array(signalEvidenceSchema).max(5).optional().default([]),
}

export const observationCreateBodySchema = z.object({
  routing_mode: z.literal('observation'),
  country_code: countryCodeSchema,
  city_slug: citySlugSchema,
  locality: z.string().trim().min(1).max(160).nullable().optional(),
  ...sharedCreateFields,
})

export const routedCreateBodySchema = z.object({
  routing_mode: z.literal('routed'),
  country_code: countryCodeSchema.optional(),
  city_slug: citySlugSchema.optional(),
  target_kind: z.enum(SIGNAL_TARGET_KINDS),
  citizen_target_id: z.string().uuid(),
  conscious_location_id: z.string().uuid(),
  partner_location_id: z.string().uuid().nullable().optional(),
  street_reference: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .nullable()
    .optional(),
  ...sharedCreateFields,
})

/** Legacy clients omit routing_mode; treat as routed when required FKs are present. */
export const legacyRoutedCreateBodySchema = routedCreateBodySchema.omit({
  routing_mode: true,
})

function defaultRoutingMode(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input
  const obj = input as Record<string, unknown>
  if (obj.routing_mode === undefined || obj.routing_mode === null) {
    return { ...obj, routing_mode: 'routed' }
  }
  return input
}

export const createSignalBodySchema = z.preprocess(
  defaultRoutingMode,
  z.discriminatedUnion('routing_mode', [
    observationCreateBodySchema,
    routedCreateBodySchema,
  ])
)

export type ObservationCreateBody = z.infer<typeof observationCreateBodySchema>
export type RoutedCreateBody = z.infer<typeof routedCreateBodySchema>
export type CreateSignalBody = z.infer<typeof createSignalBodySchema>

export function validateSignalEvidence(
  evidence: ObservationCreateBody['evidence']
): string | null {
  for (const ev of evidence) {
    const hasPath = !!ev.storage_path
    const hasUrl = !!ev.external_url
    if (hasPath === hasUrl) {
      return 'Each evidence item must have exactly one of storage_path or external_url'
    }
    if (ev.kind === 'link' && !hasUrl) {
      return 'kind=link requires external_url'
    }
    if ((ev.kind === 'image' || ev.kind === 'pdf') && !hasPath) {
      return `kind=${ev.kind} requires storage_path`
    }
  }
  return null
}

export function normalizeStreetReference(
  raw: string | null | undefined
): { value: string | null; error: string | null } {
  if (raw === undefined || raw === null) {
    return { value: null, error: null }
  }
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return { value: null, error: null }
  }
  if (trimmed.length < 3) {
    return { value: null, error: 'street_reference must be at least 3 characters' }
  }
  return { value: trimmed, error: null }
}

export function normalizeLocality(
  raw: string | null | undefined
): string | null {
  if (raw === undefined || raw === null) return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}
