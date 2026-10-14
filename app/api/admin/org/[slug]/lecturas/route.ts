import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-route-guard'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { getOrgBySlug, logEvent, orgDb } from '@/lib/org/repo'

export const runtime = 'nodejs'

const L = z.object({ es: z.string().trim().min(1).max(300), en: z.string().trim().min(1).max(300) })
const create = z.object({
  action: z.literal('create'),
  title: L,
  period: L,
  product: z.enum(['pilot', 'annual', 'continuous']),
  invited: z.number().int().min(0).optional(),
  // Every question needs a headline phrase so its headline names it.
  questions: z.array(z.object({ text: L, headline_phrase: L })).min(1).max(10),
})
const open = z.object({ action: z.literal('open'), reading_id: z.string().uuid(), field_days: z.number().int().min(1).max(60) })

/** Admin: create a reading (design) or open it to field (locks visibility). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!ORG_PORTAL_V2) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  const org = await getOrgBySlug((await params).slug)
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const raw = await request.json().catch(() => null)
  const now = new Date()

  const o = open.safeParse(raw)
  if (o.success) {
    const closes = new Date(now.getTime() + o.data.field_days * 86400000).toISOString()
    const { data } = await orgDb()
      .from('org_readings')
      .update({ status: 'field', field_opens: now.toISOString(), field_closes: closes, visibility_locked_at: now.toISOString(), updated_at: now.toISOString() })
      .eq('id', o.data.reading_id)
      .eq('org_id', org.id)
      .eq('status', 'design')
      .select('id, survey_token, visibility')
      .maybeSingle()
    if (!data) return NextResponse.json({ error: 'not_in_design' }, { status: 409 })
    await logEvent(data.id, gate.user.id, 'field_opened', { visibility: data.visibility, field_closes: closes })
    return NextResponse.json({ ok: true, survey_path: `/e/${data.survey_token}`, field_closes: closes })
  }

  const c = create.safeParse(raw)
  if (!c.success) return NextResponse.json({ error: 'bad_request', issues: c.error.issues }, { status: 400 })
  const d = c.data
  const { data: reading, error } = await orgDb()
    .from('org_readings')
    .insert({ org_id: org.id, title_es: d.title.es, title_en: d.title.en, period_es: d.period.es, period_en: d.period.en, product: d.product, invited: d.invited ?? null })
    .select('id, survey_token')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const { error: qe } = await orgDb()
    .from('org_questions')
    .insert(d.questions.map((q, i) => ({ reading_id: reading.id, position: i + 1, text_es: q.text.es, text_en: q.text.en, headline_phrase_es: q.headline_phrase.es, headline_phrase_en: q.headline_phrase.en })))
  if (qe) {
    await orgDb().from('org_readings').delete().eq('id', reading.id)
    return NextResponse.json({ error: qe.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, reading_id: reading.id, survey_path: `/e/${reading.survey_token}` })
}
