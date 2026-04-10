import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Self-serve Pulse creation for verified Pulse clients (token link).
 * Uses create_multi_market RPC; created_by = sponsor user_id or SPONSOR_PULSE_CREATED_BY_USER_ID.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const admin = createAdminClient()

    const { data: account, error: accErr } = await admin
      .from('sponsor_accounts')
      .select(
        'id, company_name, contact_email, contact_name, logo_url, tier, is_pulse_client, user_id, access_token'
      )
      .eq('access_token', token)
      .eq('status', 'active')
      .maybeSingle()

    if (accErr || !account) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    if (account.is_pulse_client !== true) {
      return NextResponse.json({ error: 'Pulse creation is only for Pulse clients' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const resolutionCriteria =
      typeof body.resolution_criteria === 'string' ? body.resolution_criteria.trim() : ''
    const resolutionDate = typeof body.resolution_date === 'string' ? body.resolution_date.trim() : ''
    const outcomesRaw = body.outcomes
    const outcomeLabels: string[] = Array.isArray(outcomesRaw)
      ? outcomesRaw.map((o: unknown) => String(o ?? '').trim()).filter(Boolean)
      : []

    if (!title || outcomeLabels.length < 2) {
      return NextResponse.json(
        { error: 'Title and at least two outcome options are required' },
        { status: 400 }
      )
    }
    if (!resolutionDate || Number.isNaN(new Date(resolutionDate).getTime())) {
      return NextResponse.json({ error: 'Valid end date is required' }, { status: 400 })
    }

    const createdBy =
      (account.user_id as string | null) ||
      process.env.SPONSOR_PULSE_CREATED_BY_USER_ID?.trim() ||
      null

    if (!createdBy) {
      return NextResponse.json(
        {
          error:
            'Pulse self-serve is not fully configured (missing sponsor user link). Contact francisco@crowdconscious.app.',
        },
        { status: 503 }
      )
    }

    const { data: marketId, error: rpcError } = await admin.rpc('create_multi_market', {
      p_title: title,
      p_description: description || null,
      p_category: 'pulse',
      p_created_by: createdBy,
      p_end_date: new Date(resolutionDate).toISOString(),
      p_outcomes: outcomeLabels,
      p_sponsor_name: account.company_name,
      p_sponsor_logo_url: account.logo_url ?? null,
      p_image_url: null,
      p_resolution_criteria: resolutionCriteria || description || null,
    })

    if (rpcError || !marketId) {
      console.error('[create-pulse] RPC', rpcError)
      return NextResponse.json({ error: rpcError?.message ?? 'Failed to create Pulse' }, { status: 500 })
    }

    const { error: upErr } = await admin
      .from('prediction_markets')
      .update({
        sponsor_account_id: account.id,
        is_pulse: true,
        pulse_client_name: account.company_name,
        pulse_client_logo: account.logo_url ?? null,
        pulse_client_email: account.contact_email,
        pulse_embed_enabled: true,
        conscious_fund_percentage: 20,
      })
      .eq('id', marketId as string)

    if (upErr) {
      console.error('[create-pulse] update', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      market_id: marketId,
      message: 'Pulse created. You can share it from your dashboard.',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[create-pulse]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
