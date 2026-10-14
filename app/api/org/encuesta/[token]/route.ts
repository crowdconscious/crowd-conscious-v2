import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { orgDb } from '@/lib/org/repo'
import { ANON_COOKIE, newAnonId, respondentHash, surveyByToken } from '@/lib/org/survey'
import { checkRateLimit, getRateLimitIdentifier, strictRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const body = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        answer: z.boolean(),
        certainty: z.number().int().min(1).max(10),
        reason: z.string().trim().max(1000).optional(),
      })
    )
    .min(1)
    .max(10),
})

/** Anonymous response to a reading in field. One per browser per reading; no personal data. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!ORG_PORTAL_V2) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const rl = await checkRateLimit(strictRateLimit, `org-survey:${await getRateLimitIdentifier(request)}`)
  if (rl && !rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  const { token } = await params
  const s = await surveyByToken(token)
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!s.open) return NextResponse.json({ error: 'closed' }, { status: 409 })
  const p = body.safeParse(await request.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const ids = new Set(s.questions.map((q) => q.id))
  const got = new Set(p.data.answers.map((a) => a.question_id))
  if (got.size !== ids.size || [...got].some((id) => !ids.has(id))) return NextResponse.json({ error: 'all_questions_required' }, { status: 400 })

  const anon = request.cookies.get(ANON_COOKIE)?.value || newAnonId()
  const hash = respondentHash(token, anon)
  const { data: resp, error } = await orgDb().from('org_responses').insert({ reading_id: s.readingId, respondent_hash: hash }).select('id').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'already_answered' : 'insert_failed' }, { status: 409 })
  const { error: ae } = await orgDb()
    .from('org_answers')
    .insert(p.data.answers.map((a) => ({ response_id: resp.id, question_id: a.question_id, answer: a.answer, certainty: a.certainty, reason: a.reason?.trim() || null })))
  if (ae) {
    await orgDb().from('org_responses').delete().eq('id', resp.id)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ANON_COOKIE, anon, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
  return res
}
