/**
 * DB access for the client portal (migration 286). Server-only, service role.
 * Every caller must check membership first (lib/org/access.ts). Readings
 * leave through toClientReading() only.
 */
import 'server-only'
import { createAdminClient } from '@/lib/supabase-admin'
import { CERTAINTY_MAX, isFirm } from './firmness'
import type { Reading, ReadingStatus } from './readings'
import { DEFAULT_RULES, type OrgRules } from './rules'
import type { RawAnswer } from './csv'
import { loadOrgContraste } from '@/lib/contraste-ia/org-server'
import { questionHash } from '@/lib/contraste-ia/org-core'

// Tables are not in the generated types until 286 is applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createAdminClient() as any

export type OrgRow = {
  id: string
  slug: string
  name: string
  locale: 'es' | 'en'
  plan: 'pilot' | 'anual' | 'continua'
  billing_status: 'active' | 'inactive'
  sello_contracted: boolean
  max_extension_days: number
  allow_early_close: boolean
  seat_limit: number
}

export const rulesOf = (o: OrgRow): OrgRules => ({
  maxExtensionDays: o.max_extension_days ?? DEFAULT_RULES.maxExtensionDays,
  allowEarlyClose: o.allow_early_close ?? DEFAULT_RULES.allowEarlyClose,
  seatLimit: o.seat_limit ?? DEFAULT_RULES.seatLimit,
})

export async function getOrgBySlug(slug: string): Promise<OrgRow | null> {
  const { data } = await db().from('orgs').select('*').eq('slug', slug).maybeSingle()
  return (data as OrgRow) ?? null
}

type ReadingRow = {
  id: string
  org_id: string
  title_es: string
  title_en: string
  period_es: string
  period_en: string
  product: Reading['product']
  status: ReadingStatus
  visibility: 'private' | 'public'
  visibility_locked_at: string | null
  field_opens: string | null
  field_closes: string | null
  extended_days: number
  closed_at: string | null
  closed_early: boolean
  survey_token: string
  invited: number | null
  created_at: string
}

/** A reading whose close time has passed is closed, whether or not a job ran yet. */
async function settleStatus(r: ReadingRow): Promise<ReadingRow> {
  if (r.status === 'field' && r.field_closes && new Date(r.field_closes).getTime() <= Date.now()) {
    await db().from('org_readings').update({ status: 'closed', closed_at: r.field_closes, updated_at: new Date().toISOString() }).eq('id', r.id).eq('status', 'field')
    await db().from('org_reading_events').insert({ reading_id: r.id, action: 'closed', detail: { by: 'schedule' } })
    return { ...r, status: 'closed', closed_at: r.field_closes }
  }
  return r
}

export async function getReadingRow(orgId: string, readingId: string): Promise<ReadingRow | null> {
  const { data } = await db().from('org_readings').select('*').eq('org_id', orgId).eq('id', readingId).maybeSingle()
  return data ? settleStatus(data as ReadingRow) : null
}

export async function listReadingRows(orgId: string): Promise<ReadingRow[]> {
  const { data } = await db().from('org_readings').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
  return Promise.all(((data as ReadingRow[]) ?? []).map(settleStatus))
}

async function countResponses(readingId: string) {
  const { count } = await db().from('org_responses').select('id', { count: 'exact', head: true }).eq('reading_id', readingId)
  return count ?? 0
}

const REASONS_PER_GROUP = 40

/** Builds the internal Reading (raw reasons). Pass it through toClientReading before it leaves the server. */
export async function loadReading(row: ReadingRow): Promise<Reading> {
  const responded = await countResponses(row.id)
  const closesInDays = row.field_closes ? Math.max(0, Math.ceil((new Date(row.field_closes).getTime() - Date.now()) / 86400000)) : undefined
  const base: Reading = {
    id: row.id,
    title: { es: row.title_es, en: row.title_en },
    period: { es: row.period_es, en: row.period_en },
    status: row.status,
    visibility: row.visibility,
    visibilityLockedAt: row.visibility_locked_at ?? '',
    fieldOpens: row.field_opens ?? '',
    fieldCloses: row.field_closes ?? '',
    closesInDays,
    invited: row.invited ?? 0,
    responded,
    sample: { mode: 'all' },
    product: row.product,
    questions: [],
  }
  if (row.status !== 'closed') return base
  const { data: qrows } = await db().from('org_questions').select('*').eq('reading_id', row.id).order('position')
  const { data: hist } = await db().rpc('org_question_histograms', { p_reading_id: row.id })
  // Contraste IA (closed readings only): hash the wording in the survey's language, as locked.
  const { data: orgRow } = await db().from('orgs').select('locale').eq('id', row.org_id).maybeSingle()
  const lang: 'es' | 'en' = orgRow?.locale === 'en' ? 'en' : 'es'
  const title = lang === 'en' ? row.title_en : row.title_es
  const contraste = await loadOrgContraste(
    db(),
    row.id,
    ((qrows as { id: string; text_es: string; text_en: string }[]) ?? []).map((q) => ({ id: q.id, hash: questionHash({ title, locale: lang }, lang === 'en' ? q.text_en : q.text_es) })),
  ).catch(() => new Map())
  const questions = await Promise.all(
    ((qrows as { id: string; text_es: string; text_en: string; headline_phrase_es: string; headline_phrase_en: string }[]) ?? []).map(async (q) => {
      const yes = Array(CERTAINTY_MAX).fill(0)
      const no = Array(CERTAINTY_MAX).fill(0)
      for (const h of (hist as { question_id: string; answer: boolean; certainty: number; n: number }[]) ?? []) {
        if (h.question_id !== q.id) continue
        ;(h.answer ? yes : no)[h.certainty - 1] += Number(h.n)
      }
      const { data: rs } = await db()
        .from('org_answers')
        .select('answer, certainty, reason')
        .eq('question_id', q.id)
        .not('reason', 'is', null)
        .limit(REASONS_PER_GROUP * 4)
      const reasons = ((rs as { answer: boolean; certainty: number; reason: string }[]) ?? []).filter((x) => x.reason.trim())
      return {
        id: q.id,
        text: { es: q.text_es, en: q.text_en },
        headlinePhrase: { es: q.headline_phrase_es, en: q.headline_phrase_en },
        counts: { yes, no },
        contraste: contraste.get(q.id) ?? null,
        reasons: {
          tentativeYes: reasons.filter((x) => x.answer && !isFirm(x.certainty)).slice(0, REASONS_PER_GROUP).map((x) => ({ text: x.reason, certainty: x.certainty })),
          no: reasons.filter((x) => !x.answer).slice(0, REASONS_PER_GROUP).map((x) => ({ text: x.reason, certainty: x.certainty })),
        },
      }
    })
  )
  return { ...base, questions }
}

/** All answers of a closed reading, for the individual-answers CSV (no IDs, no timestamps). */
export async function loadRawAnswers(readingId: string): Promise<RawAnswer[]> {
  const { data: qrows } = await db().from('org_questions').select('id').eq('reading_id', readingId)
  const ids = ((qrows as { id: string }[]) ?? []).map((q) => q.id)
  if (!ids.length) return []
  const out: RawAnswer[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data } = await db().from('org_answers').select('question_id, answer, certainty, reason').in('question_id', ids).range(from, from + page - 1)
    const rows = (data as { question_id: string; answer: boolean; certainty: number; reason: string | null }[]) ?? []
    out.push(...rows.map((r) => ({ questionId: r.question_id, answer: r.answer, certainty: r.certainty, reason: r.reason })))
    if (rows.length < page || out.length >= 100_000) break
  }
  return out
}

export async function logEvent(readingId: string, actor: string | null, action: string, detail: Record<string, unknown> = {}) {
  await db().from('org_reading_events').insert({ reading_id: readingId, actor_user_id: actor, action, detail })
}

export { db as orgDb }
export type { ReadingRow }
