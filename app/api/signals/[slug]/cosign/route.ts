import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromRequest } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import {
  standardRateLimit,
  getRateLimitIdentifier,
} from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Co-sign / un-co-sign a Citizen Signal.
 *
 * - Only signals in publication_status = 'published' can be co-signed.
 * - UNIQUE (signal_id, user_id) prevents duplicates at the DB layer; we
 *   surface that as a 409 Conflict so the client can render an idempotent
 *   "already co-signed" state.
 * - The DB trigger maintains citizen_signals.cosign_count; we never write
 *   the counter directly.
 */

function flagOn() {
  return process.env.SIGNALS_ENABLED === 'true'
}

async function resolvePublishedSignal(slug: string) {
  const admin = createSignalsAdminClient()
  const { data, error } = await admin
    .from('citizen_signals')
    .select('id, publication_status')
    .eq('public_slug', slug)
    .maybeSingle()
  if (error) {
    return { error }
  }
  if (!data || data.publication_status !== 'published') {
    return { notFound: true }
  }
  return { signal: data, admin }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const user = await getCurrentUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (standardRateLimit) {
      const id = await getRateLimitIdentifier(request, user.id)
      const rate = await standardRateLimit.limit(`signals-cosign:${id}`)
      if (!rate.success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }

    const { slug } = await params
    const resolved = await resolvePublishedSignal(slug)
    if ('error' in resolved && resolved.error) {
      console.error('[api/signals/cosign POST] lookup', resolved.error)
      return NextResponse.json({ error: resolved.error.message }, { status: 500 })
    }
    if ('notFound' in resolved) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { signal, admin } = resolved

    const { error: insertErr } = await admin
      .from('citizen_signal_cosigns')
      .insert({ signal_id: signal.id, user_id: user.id })

    if (insertErr) {
      // Postgres unique_violation
      if ((insertErr as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'Already co-signed', code: 'DUPLICATE' },
          { status: 409 }
        )
      }
      console.error('[api/signals/cosign POST] insert', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Read the fresh counter (the trigger has already updated it).
    const { data: fresh } = await admin
      .from('citizen_signals')
      .select('cosign_count')
      .eq('id', signal.id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      cosign_count: fresh?.cosign_count ?? null,
    })
  } catch (err) {
    console.error('[api/signals/cosign POST] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const user = await getCurrentUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (standardRateLimit) {
      const id = await getRateLimitIdentifier(request, user.id)
      const rate = await standardRateLimit.limit(`signals-cosign-rm:${id}`)
      if (!rate.success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }

    const { slug } = await params
    const resolved = await resolvePublishedSignal(slug)
    if ('error' in resolved && resolved.error) {
      console.error('[api/signals/cosign DELETE] lookup', resolved.error)
      return NextResponse.json({ error: resolved.error.message }, { status: 500 })
    }
    if ('notFound' in resolved) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { signal, admin } = resolved

    const { error: delErr } = await admin
      .from('citizen_signal_cosigns')
      .delete()
      .eq('signal_id', signal.id)
      .eq('user_id', user.id)

    if (delErr) {
      console.error('[api/signals/cosign DELETE] delete', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    const { data: fresh } = await admin
      .from('citizen_signals')
      .select('cosign_count')
      .eq('id', signal.id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      cosign_count: fresh?.cosign_count ?? null,
    })
  } catch (err) {
    console.error('[api/signals/cosign DELETE] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
