import 'server-only'
import { createHmac, randomBytes } from 'node:crypto'
import { orgDb } from './repo'

export const ANON_COOKIE = 'cc_org_anon'

export function newAnonId() {
  return randomBytes(24).toString('base64url')
}

/** Per-reading anonymous hash: dedupes one browser per reading, identifies no one. */
export function guardSecret() {
  const key = process.env.ORG_RESPONDENT_SECRET || process.env.ORG_SHARE_SECRET
  if (!key || key.length < 32) throw new Error('ORG_RESPONDENT_SECRET (>=32 chars) is not configured')
  return key
}

export function respondentHash(surveyToken: string, anonId: string) {
  const key = guardSecret()
  return createHmac('sha256', key).update(`${surveyToken}:${anonId}`).digest('base64url')
}

export type SurveyView = {
  readingId: string
  locale: 'es' | 'en'
  orgName: string
  title: { es: string; en: string }
  open: boolean
  questions: { id: string; text: { es: string; en: string } }[]
}

export async function surveyByToken(token: string): Promise<SurveyView | null> {
  if (!/^[a-f0-9]{24,64}$/.test(token)) return null
  const { data: r } = await orgDb()
    .from('org_readings')
    .select('id, status, field_closes, title_es, title_en, orgs(name, locale)')
    .eq('survey_token', token)
    .maybeSingle()
  if (!r) return null
  const { data: qs } = await orgDb().from('org_questions').select('id, text_es, text_en').eq('reading_id', r.id).order('position')
  const open = r.status === 'field' && !!r.field_closes && new Date(r.field_closes).getTime() > Date.now()
  return {
    readingId: r.id,
    locale: r.orgs?.locale === 'en' ? 'en' : 'es',
    orgName: r.orgs?.name ?? '',
    title: { es: r.title_es, en: r.title_en },
    open,
    questions: ((qs as { id: string; text_es: string; text_en: string }[]) ?? []).map((q) => ({ id: q.id, text: { es: q.text_es, en: q.text_en } })),
  }
}
