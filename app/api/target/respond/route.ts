import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { hashTargetToken, safeHashEquals } from '@/lib/target-token-hash'
import { moderateRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Public API: a target rep posts an official response to one of their
 * signals. Auth is token-based — the raw token from the magic-link URL is
 * sent in the body and hashed + timing-safe compared against the stored
 * token_hash on citizen_target_access_tokens. The token must be unrevoked
 * and unexpired; the signal's citizen_target_id must match the token's
 * target.
 */

const bodySchema = z.object({
  token: z.string().trim().min(8).max(256),
  signal_id: z.string().uuid(),
  author_label: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(8000),
  official_status: z.enum(['acknowledged', 'in_progress', 'resolved']),
})

function flagOn() {
  return process.env.SIGNALS_ENABLED === 'true'
}

export async function POST(request: NextRequest) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    if (moderateRateLimit) {
      const id = await getRateLimitIdentifier(request)
      const rate = await moderateRateLimit.limit(`target-respond:${id}`)
      if (!rate.success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const payload = parsed.data

    const admin = createSignalsAdminClient()
    const candidateHash = hashTargetToken(payload.token)

    const { data: tokenRow } = await admin
      .from('citizen_target_access_tokens')
      .select('id, citizen_target_id, token_hash, expires_at, revoked_at')
      .eq('token_hash', candidateHash)
      .maybeSingle()

    if (!tokenRow) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    if (!safeHashEquals(tokenRow.token_hash, candidateHash)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    if (tokenRow.revoked_at) {
      return NextResponse.json({ error: 'Token revoked' }, { status: 401 })
    }
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    // Confirm the signal exists, is published, and belongs to this target.
    const { data: signal } = await admin
      .from('citizen_signals')
      .select('id, citizen_target_id, publication_status')
      .eq('id', payload.signal_id)
      .maybeSingle()
    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }
    if (signal.citizen_target_id !== tokenRow.citizen_target_id) {
      return NextResponse.json(
        { error: 'Signal does not belong to this target' },
        { status: 403 }
      )
    }
    if (signal.publication_status !== 'published') {
      return NextResponse.json(
        { error: 'Signal is not published' },
        { status: 400 }
      )
    }

    const { data: inserted, error: insErr } = await admin
      .from('citizen_signal_responses')
      .insert({
        signal_id: signal.id,
        citizen_target_id: tokenRow.citizen_target_id,
        author_label: payload.author_label,
        body: payload.body,
        official_status: payload.official_status,
      })
      .select('id, author_label, body, official_status, created_at')
      .single()

    if (insErr || !inserted) {
      console.error('[api/target/respond POST] insert', insErr)
      return NextResponse.json(
        { error: insErr?.message ?? 'Insert failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    console.error('[api/target/respond POST] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
