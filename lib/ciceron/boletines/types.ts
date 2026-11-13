import { z } from 'zod'

export const bulletinTierSchema = z.enum([
  'A',
  'B',
  'C',
  'D',
  'E',
  'not_verified',
])
export type BulletinTier = z.infer<typeof bulletinTierSchema>

export const bulletinRunStatusSchema = z.enum([
  'ok',
  'failed',
  'partial',
  'manual',
])
export type BulletinRunStatus = z.infer<typeof bulletinRunStatusSchema>

export const bulletinFailureStageSchema = z.enum([
  'fetch',
  'parse',
  'count_check',
  'terms',
  'disabled',
  'manual_required',
])
export type BulletinFailureStage = z.infer<typeof bulletinFailureStageSchema>

export const parsedBulletinEntrySchema = z.object({
  courtName: z.string().nullable(),
  expedienteNumber: z.string().nullable(),
  partyNames: z.string().nullable(),
  parties: z.array(z.string()).optional(),
  summary: z.string().nullable(),
  sourceUrl: z.string().nullable().optional(),
})
export type ParsedBulletinEntry = z.infer<typeof parsedBulletinEntrySchema>

export const bulletinFetchResultSchema = z.object({
  ok: z.boolean(),
  status: z.number().optional(),
  body: z.string().optional(),
  finalUrl: z.string().optional(),
  error: z.string().optional(),
  durationMs: z.number(),
})
export type BulletinFetchResult = z.infer<typeof bulletinFetchResultSchema>

export type BulletinParseResult = {
  ok: boolean
  entries: ParsedBulletinEntry[]
  bulletinNumber: string | null
  error?: string
}

export type BulletinCountCheck = {
  ok: boolean
  expected: number | null
  actual: number
  message?: string
}

export const PARSER_VERSION = 'boletines-1.0.0'

export type BulletinSourceRow = {
  id: string
  sourceKey: string
  stateCode: string
  stateName: string
  displayName: string
  landingUrl: string
  proposedTier: BulletinTier
  enabled: boolean
  verifiedBy: string | null
  verifiedOn: string | null
  termsReviewedOn: string | null
  robotsOk: boolean
  termsOk: boolean
  hasCaptcha: boolean
  needsLogin: boolean
  adapterKey: string | null
  retentionDays: number
}
