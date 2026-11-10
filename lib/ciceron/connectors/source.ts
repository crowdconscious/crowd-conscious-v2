import { z } from 'zod'

export const sourceListItemSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().nullable(),
  date: z.string().min(8), // ISO yyyy-mm-dd
  editionKind: z.enum(['matutina', 'vespertina', 'extraordinaria']),
  section: z.string().nullable(),
  authority: z.string().nullable(),
  raw: z.unknown(),
})

export type SourceListItem = z.infer<typeof sourceListItemSchema>

export const sourceItemSchema = z.object({
  externalId: z.string().min(1),
  title: z.string(),
  date: z.string().min(8),
  editionKind: z.enum(['matutina', 'vespertina', 'extraordinaria']).nullable(),
  section: z.string().nullable(),
  authority: z.string().nullable(),
  html: z.string(),
  officialUrl: z.string().url().nullable(),
  raw: z.unknown(),
})

export type SourceItem = z.infer<typeof sourceItemSchema>

export type SourceHealth = {
  ok: boolean
  sourceKey: string
  checkedAt: string
  message: string
  latencyMs: number
}

/**
 * Template every later corpus source follows (Prompt 3).
 * Implementations must be polite: serial requests, backoff, identifying UA.
 */
export interface SourceConnector {
  readonly sourceKey: string
  listForDate(isoDate: string): Promise<SourceListItem[]>
  fetchItem(externalId: string, opts?: { listHint?: SourceListItem }): Promise<SourceItem | null>
  normalise(item: SourceItem): { text: string; title: string }
  health(): Promise<SourceHealth>
}
