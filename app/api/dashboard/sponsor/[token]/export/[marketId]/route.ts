import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { marketBelongsToSponsorAccount } from '@/lib/sponsor-account-access'

export const dynamic = 'force-dynamic'

/** CSV of votes for a market (Pulse / sponsor token auth). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; marketId: string }> }
) {
  try {
    const { token, marketId } = await params
    const admin = createAdminClient()

    const { data: account } = await admin
      .from('sponsor_accounts')
      .select('id, company_name, contact_email')
      .eq('access_token', token)
      .eq('status', 'active')
      .maybeSingle()

    if (!account) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    const { data: market } = await admin
      .from('prediction_markets')
      .select(
        'id, title, sponsor_account_id, sponsor_name, pulse_client_email, is_pulse'
      )
      .eq('id', marketId)
      .maybeSingle()

    if (!market || !marketBelongsToSponsorAccount(market, account)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: outcomes } = await admin
      .from('market_outcomes')
      .select('id, label')
      .eq('market_id', marketId)

    const labelById = new Map((outcomes ?? []).map((o) => [o.id, o.label]))

    const { data: votes } = await admin
      .from('market_votes')
      .select('created_at, outcome_id, confidence, reasoning, is_anonymous')
      .eq('market_id', marketId)
      .order('created_at', { ascending: true })

    const headers = ['created_at', 'outcome_label', 'confidence', 'anonymous', 'reasoning']
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`
    const lines = [headers.join(',')]
    for (const v of votes ?? []) {
      const label = labelById.get(v.outcome_id as string) ?? v.outcome_id
      lines.push(
        [
          new Date(v.created_at as string).toISOString(),
          escape(String(label)),
          String(v.confidence ?? ''),
          v.is_anonymous ? 'yes' : 'no',
          escape(String((v as { reasoning?: string }).reasoning ?? '')),
        ].join(',')
      )
    }

    const csv = lines.join('\n')
    const safeTitle = String(market.title ?? 'market')
      .slice(0, 40)
      .replace(/[^\w\s-]/g, '')
      .trim()

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sponsor-${safeTitle}-${marketId.slice(0, 8)}.csv"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
