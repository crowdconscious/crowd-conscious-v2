import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { orgDb } from '@/lib/org/repo'
import { ANON_COOKIE, guardSecret, newAnonId, respondentHash, surveyByToken } from '@/lib/org/survey'
import { RATE_LIMITS, clientIp, rateKey, verifyNonce } from '@/lib/org/survey-guard'

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
  nonce: z.string().max(300),
})

/** Anonymous response to a reading in field. One per browser per reading; no personal data. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!ORG_PORTAL_V2) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { token } = await params
  if (!/^[a-f0-9]{24,64}$/.test(token)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const secret = guardSecret()
  // Rate limit per HMAC(IP + token), in Postgres. Fails closed if the counter can't be written.
  const ip = clientIp(request.headers)
  for (const w of RATE_LIMITS) {
    const { data: allowed, error: rle } = await orgDb().rpc('org_survey_rate_hit', { p_key: rateKey(secret, ip, token, w.windowSeconds), p_window_seconds: w.windowSeconds, p_limit: w.limit })
    if (rle) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
    if (allowed !== true) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(w.windowSeconds) } })
  }
  const s = await surveyByToken(token)
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!s.open) return NextResponse.json({ error: 'closed' }, { status: 409 })
  const p = body.safeParse(await request.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const n = verifyNonce(secret, p.data.nonce, s.readingId)
  if (!n.ok) return NextResponse.json({ error: n.reason === 'too_fast' ? 'too_fast' : 'reload' }, { status: n.reason === 'too_fast' ? 429 : 400 })
  const ids = new Set(s.questions.map((q) => q.id))
  const got = new Set(p.data.answers.map((a) => a.question_id))
  if (got.size !== ids.size || [...got].some((id) => !ids.has(id))) return NextResponse.json({ error: 'all_questions_required' }, { status: 400 })

  // One-time nonce: consumed before the response is stored (unique on nonce_hash).
  const { error: ne } = await orgDb().from('org_survey_nonces').insert({ nonce_hash: n.nonceHash, reading_id: s.readingId, expires_at: n.expiresAt.toISOString() })
  if (ne) return NextResponse.json({ error: ne.code === '23505' ? 'reload' : 'unavailable' }, { status: ne.code === '23505' ? 409 : 503 })

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
