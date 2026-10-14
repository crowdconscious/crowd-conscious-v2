/**
 * One place that resolves (slug, reading id) to a client-safe reading for
 * pages and API routes, demo included. Raw readings never leave this module
 * except through toClientReading (and raw answers only to the CSV builder).
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { orgAccess, type OrgAccess, type Role } from './access'
import { DEMO_ORG, DEMO_READINGS, previousClosed } from './demo-data'
import { toClientReading, type ClientReading } from './readings'
import { getOrgBySlug, getReadingRow, listReadingRows, loadRawAnswers, loadReading, rulesOf, type OrgRow } from './repo'
import { MIN_RESPONSES_FOR_HEADLINE, segmentFor } from './firmness'
import type { RawAnswer } from './csv'
import { DEFAULT_RULES, selloEarned, type OrgRules } from './rules'

export type OrgContext = {
  demo: boolean
  slug: string
  name: string
  role: Role
  userId: string | null
  org: OrgRow | null
  rules: OrgRules
  billingActive: boolean
  sello: boolean
}

export async function orgContext(slug: string): Promise<{ ok: true; ctx: OrgContext; access: OrgAccess } | { ok: false; access: OrgAccess }> {
  const access = await orgAccess(slug)
  if (access.kind === 'demo') {
    const sello = selloEarned('active', DEMO_READINGS)
    return { ok: true, access, ctx: { demo: true, slug, name: DEMO_ORG.name, role: 'viewer', userId: null, org: null, rules: DEFAULT_RULES, billingActive: true, sello } }
  }
  if (access.kind !== 'member') return { ok: false, access }
  const rows = await listReadingRows(access.org.id)
  return {
    ok: true,
    access,
    ctx: {
      demo: false,
      slug,
      name: access.org.name,
      role: access.role,
      userId: access.userId,
      org: access.org,
      rules: rulesOf(access.org),
      billingActive: access.org.billing_status === 'active',
      sello: selloEarned(access.org.billing_status, rows),
    },
  }
}

export async function clientReadings(ctx: OrgContext): Promise<ClientReading[]> {
  if (ctx.demo) return DEMO_READINGS.map(toClientReading)
  const rows = await listReadingRows(ctx.org!.id)
  return Promise.all(rows.map(async (r) => toClientReading(await loadReading(r))))
}

export async function clientReading(ctx: OrgContext, id: string): Promise<{ reading: ClientReading; earlier: ClientReading | null } | null> {
  if (ctx.demo) {
    const raw = DEMO_READINGS.find((r) => r.id === id)
    if (!raw) return null
    const prev = previousClosed(id)
    return { reading: toClientReading(raw), earlier: prev ? toClientReading(prev) : null }
  }
  const all = await clientReadings(ctx)
  const i = all.findIndex((r) => r.id === id)
  if (i < 0) return null
  return { reading: all[i], earlier: all.slice(i + 1).find((r) => r.status === 'closed') ?? null }
}

/** Demo answers are synthesised from the fictitious histograms (reasons attached where the demo has them). */
export async function rawAnswers(ctx: OrgContext, id: string): Promise<RawAnswer[]> {
  if (ctx.demo) {
    const raw = DEMO_READINGS.find((r) => r.id === id)
    if (!raw) return []
    const out: RawAnswer[] = []
    for (const q of raw.questions) {
      const pool = { tentativeYes: [...q.reasons.tentativeYes], no: [...q.reasons.no] }
      for (const [ans, h] of [[true, q.counts.yes], [false, q.counts.no]] as const)
        h.forEach((n, i) => {
          for (let k = 0; k < n; k++) {
            const seg = segmentFor(ans ? 'yes' : 'no', i + 1)
            const src = seg === 'tentativeYes' ? pool.tentativeYes : !ans ? pool.no : null
            const idx = src ? src.findIndex((x) => x.certainty === i + 1) : -1
            const reason = src && idx >= 0 ? src.splice(idx, 1)[0].text : null
            out.push({ questionId: q.id, answer: ans, certainty: i + 1, reason })
          }
        })
    }
    return out
  }
  const row = await getReadingRow(ctx.org!.id, id)
  return row && row.status === 'closed' ? loadRawAnswers(id) : []
}

export function denied(access: OrgAccess) {
  return NextResponse.json({ error: access.kind === 'login' ? 'Unauthorized' : 'Not found' }, { status: access.kind === 'login' ? 401 : 404 })
}

/** Owner controls model for a reading (null for the demo, which is read-only). */
export async function controlsFor(ctx: OrgContext, id: string, responded: number) {
  if (ctx.demo) return null
  const row = await getReadingRow(ctx.org!.id, id)
  if (!row) return null
  return {
    apiBase: `/api/org/${ctx.slug}/lecturas/${id}`,
    canEdit: ctx.role === 'owner',
    status: row.status,
    visibility: row.visibility,
    responded,
    maxExtensionDays: ctx.rules.maxExtensionDays,
    extendedDays: row.extended_days,
    allowEarlyClose: ctx.rules.allowEarlyClose,
    minResponses: MIN_RESPONSES_FOR_HEADLINE,
    surveyPath: `/e/${row.survey_token}`,
  }
}

/** For a verified share token only: no membership check (the token is the permission). */
export async function readingForShare(slug: string, id: string): Promise<{ name: string; demo: boolean; reading: ClientReading } | null> {
  if (slug === DEMO_ORG.slug) {
    const raw = DEMO_READINGS.find((r) => r.id === id)
    return raw ? { name: DEMO_ORG.name, demo: true, reading: toClientReading(raw) } : null
  }
  const org = await getOrgBySlug(slug)
  if (!org) return null
  const row = await getReadingRow(org.id, id)
  if (!row || row.status !== 'closed') return null
  return { name: org.name, demo: false, reading: toClientReading(await loadReading(row)) }
}
