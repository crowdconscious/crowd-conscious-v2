import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import {
  lenientRateLimit,
  standardRateLimit,
  getRateLimitIdentifier,
} from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Comments on a Citizen Signal.
 *
 * - GET is public and reads comments on any **published** signal.
 * - POST requires auth and writes only when the parent signal is
 *   published. We also include a tiny `profiles` join for display name
 *   + avatar so the client can render without a second round-trip.
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
  if (error) return { error }
  if (!data || data.publication_status !== 'published') return { notFound: true }
  return { signal: data, admin }
}

const commentSchema = z.object({
  body: z.string().trim().min(2).max(2000),
})

// =============================================================================
// GET — list comments
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    if (lenientRateLimit) {
      const id = await getRateLimitIdentifier(request)
      const rate = await lenientRateLimit.limit(`signals-comments-list:${id}`)
      if (!rate.success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }

    const { slug } = await params
    const resolved = await resolvePublishedSignal(slug)
    if ('error' in resolved && resolved.error) {
      console.error('[api/signals/comments GET] lookup', resolved.error)
      return NextResponse.json({ error: resolved.error.message }, { status: 500 })
    }
    if ('notFound' in resolved) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { signal, admin } = resolved

    const { data: comments, error } = await admin
      .from('citizen_signal_comments')
      .select('id, author_user_id, body, created_at')
      .eq('signal_id', signal.id)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      console.error('[api/signals/comments GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Hydrate display-name + avatar via the existing public RPC so we
    // don't leak the full profiles row.
    const authorIds = Array.from(
      new Set((comments ?? []).map((c) => c.author_user_id).filter(Boolean) as string[])
    )
    let profilesMap = new Map<string, { full_name: string | null; avatar_url: string | null }>()
    if (authorIds.length > 0) {
      const { data: profiles } = await admin.rpc('get_profiles_public', {
        p_ids: authorIds,
      })
      if (profiles) {
        for (const p of profiles) {
          profilesMap.set(p.id, {
            full_name: p.full_name,
            avatar_url: p.avatar_url,
          })
        }
      }
    }

    const hydrated = (comments ?? []).map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author: c.author_user_id
        ? profilesMap.get(c.author_user_id) ?? null
        : null,
    }))

    return NextResponse.json({ comments: hydrated })
  } catch (err) {
    console.error('[api/signals/comments GET] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// =============================================================================
// POST — write comment (authenticated, published signals only)
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (standardRateLimit) {
      const id = await getRateLimitIdentifier(request, user.id)
      const rate = await standardRateLimit.limit(`signals-comments-post:${id}`)
      if (!rate.success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }

    const json = await request.json().catch(() => null)
    const parsed = commentSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { slug } = await params
    const resolved = await resolvePublishedSignal(slug)
    if ('error' in resolved && resolved.error) {
      console.error('[api/signals/comments POST] lookup', resolved.error)
      return NextResponse.json({ error: resolved.error.message }, { status: 500 })
    }
    if ('notFound' in resolved) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { signal, admin } = resolved

    const { data: inserted, error: insErr } = await admin
      .from('citizen_signal_comments')
      .insert({
        signal_id: signal.id,
        author_user_id: user.id,
        body: parsed.data.body,
      })
      .select('id, body, created_at')
      .single()

    if (insErr || !inserted) {
      console.error('[api/signals/comments POST] insert', insErr)
      return NextResponse.json(
        { error: insErr?.message ?? 'Insert failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        id: inserted.id,
        body: inserted.body,
        created_at: inserted.created_at,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[api/signals/comments POST] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
