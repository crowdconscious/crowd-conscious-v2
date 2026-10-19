import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth/is-admin'
import { notifyPulsePublished } from '@/lib/expo-push'
import { isStandOnly } from '@/lib/pulse/discovery-filters'
import { ensurePredictionLocked, withTimeout } from '@/lib/contraste-ia/server'
import { decidePublish, parseForce, type PublishDecision } from '@/lib/contraste-ia/publish-gate'

// Contraste IA locks the AI prediction BEFORE is_draft flips (zero votes possible).
export const maxDuration = 120

/** Max wait for the pre-publish Contraste IA lock. On timeout/failure the Pulse
 *  STAYS A DRAFT and the admin gets a 409 with the error, unless the request
 *  carries { force: true } ("publish anyway, prediction will be late"). */
const CONTRASTE_LOCK_TIMEOUT_MS = 75_000

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as { force?: unknown }
    const force = parseForce(body?.force ?? request.nextUrl.searchParams.get('force'))
    const admin = createAdminClient()

    const { data: market, error: fetchErr } = await admin
      .from('prediction_markets')
      .select('id, is_draft, created_by, is_pulse, title, tags')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) {
      console.error('Publish market fetch error:', fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    const isAdmin = isAdminUser(user)
    const isCreator = market.created_by === user.id
    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!market.is_draft) {
      // Idempotent: already published. Still try to enqueue sim (no-op if
      // a job row already exists, or if SIM_AUTORUN_ENABLED is off).
      if (market.is_pulse) {
        // Contraste IA: if no prediction exists yet, lock one now (DB marks it 'late' if votes exist).
        void ensurePredictionLocked(admin, id, 'publish')
        const { enqueueAutorunJobFireAndForget } = await import(
          '@/lib/simulation/autorun'
        )
        enqueueAutorunJobFireAndForget(admin, id, 'auto')
      }
      return NextResponse.json({ success: true, already_published: true })
    }

    // Contraste IA: run + lock the AI prediction while the Pulse is still a
    // draft, so it provably uses only the question/options and zero votes.
    let decision: PublishDecision | null = null
    if (market.is_pulse) {
      const lock = await withTimeout(
        ensurePredictionLocked(admin, id, 'publish'),
        CONTRASTE_LOCK_TIMEOUT_MS,
        { ok: false as const, error: 'timeout' },
      )
      decision = decidePublish(lock, { force })
      if (!decision.publish) {
        console.warn('[publish-market] contraste-ia lock failed, kept as draft:', id, lock.ok ? '' : lock.error)
        return NextResponse.json(
          { error: decision.error, code: decision.code, can_override: true, is_draft: true },
          { status: 409 },
        )
      }
      if (decision.contraste === 'override_unlocked') {
        console.warn('[publish-market] admin override: publishing without locked prediction', id, user.id)
      }
    }

    const { error: upErr } = await admin
      .from('prediction_markets')
      .update({
        is_draft: false,
        published_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (upErr) {
      console.error('Publish market update error:', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    if (market.is_pulse) {
      // Stand-only Pulses are QR/event-only — skip the mass "new Pulse" push
      // to every push-enabled mobile user. Simulation enqueue still runs.
      if (!isStandOnly(market.tags as string[] | null)) {
        try {
          await notifyPulsePublished(admin, {
            marketId: id,
            title: market.title ?? 'Pulse',
            mode: 'announce',
          })
        } catch (err) {
          console.warn('[publish-market] pulse push error:', err)
        }
      }

      // Queue an agent simulation — fire-and-forget; never slows publish.
      const { enqueueAutorunJobFireAndForget } = await import(
        '@/lib/simulation/autorun'
      )
      enqueueAutorunJobFireAndForget(admin, id, 'auto')
    }

    return NextResponse.json({
      success: true,
      contraste_ia: decision?.publish ? decision.contraste : null,
      warning: decision?.publish ? decision.warning ?? null : null,
    })
  } catch (err) {
    console.error('Publish market error:', err)
    return NextResponse.json({ error: 'Failed to publish market' }, { status: 500 })
  }
}
