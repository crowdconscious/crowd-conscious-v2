import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isValidMarketCategory } from '@/lib/market-categories'

function isAdminUser(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const em = user.email?.toLowerCase().trim()
  return user.user_type === 'admin' || (!!adminEmail && !!em && em === adminEmail)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const category = String(body.category ?? '').trim()
    if (!category || !isValidMarketCategory(category)) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 })
    }

    const resolutionDate = body.resolution_date
    if (!resolutionDate || typeof resolutionDate !== 'string') {
      return NextResponse.json({ error: 'Resolution date is required' }, { status: 400 })
    }

    const rawFund = Number(body.conscious_fund_percentage)
    const fundPct = Number.isFinite(rawFund)
      ? Math.round(Math.min(100, Math.max(0, rawFund)))
      : 20

    let tags: string[] = []
    if (typeof body.tags === 'string') {
      tags = body.tags
        .split(/[,;]/)
        .map((t: string) => t.trim().toLowerCase())
        .filter(Boolean)
    } else if (Array.isArray(body.tags)) {
      tags = body.tags.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean)
    }

    let verificationSources: string[] = []
    if (Array.isArray(body.verification_sources)) {
      verificationSources = body.verification_sources.filter(
        (s: unknown) => typeof s === 'string' && s.trim().length > 0
      ) as string[]
    } else if (typeof body.verification_sources === 'string') {
      verificationSources = body.verification_sources
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean)
    }

    const translationsIn =
      body.translations && typeof body.translations === 'object' ? body.translations : null

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('prediction_markets')
      .select('is_pulse, translations')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    const marketIsPulse = existing.is_pulse === true

    const updateRow: Record<string, unknown> = {
      title,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      resolution_criteria:
        typeof body.resolution_criteria === 'string' ? body.resolution_criteria.trim() || null : null,
      resolution_date: new Date(resolutionDate).toISOString(),
      category,
      tags,
      verification_sources: verificationSources,
      cover_image_url:
        typeof body.cover_image_url === 'string' ? body.cover_image_url.trim() || null : null,
      sponsor_name: typeof body.sponsor_name === 'string' ? body.sponsor_name.trim() || null : null,
      sponsor_logo_url:
        typeof body.sponsor_logo_url === 'string' ? body.sponsor_logo_url.trim() || null : null,
      sponsor_url: typeof body.sponsor_url === 'string' ? body.sponsor_url.trim() || null : null,
      conscious_fund_percentage: fundPct,
    }

    if (body.sponsor_account_id !== undefined) {
      const sid = body.sponsor_account_id
      if (sid === null || sid === '') {
        updateRow.sponsor_account_id = null
      } else if (typeof sid === 'string') {
        updateRow.sponsor_account_id = sid
      }
    }

    if (translationsIn) {
      const prevTr = (existing.translations as { en?: Record<string, string> } | null) || {}
      const enIn = (translationsIn as { en?: Record<string, string> }).en
      updateRow.translations = {
        ...prevTr,
        ...(enIn && typeof enIn === 'object' ? { en: { ...prevTr.en, ...enIn } } : {}),
      }
    }

    if (marketIsPulse) {
      updateRow.pulse_client_name =
        typeof body.pulse_client_name === 'string' ? body.pulse_client_name.trim() || null : null
      updateRow.pulse_client_logo =
        typeof body.pulse_client_logo === 'string' ? body.pulse_client_logo.trim() || null : null
      updateRow.pulse_client_email =
        typeof body.pulse_client_email === 'string' ? body.pulse_client_email.trim() || null : null
    }

    const { error: upErr } = await admin.from('prediction_markets').update(updateRow).eq('id', id)

    if (upErr) {
      console.error('Admin market update:', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    if (Array.isArray(body.outcomes)) {
      for (const o of body.outcomes) {
        if (!o || typeof o.id !== 'string' || typeof o.label !== 'string') continue
        const label = o.label.trim()
        if (!label) continue

        // Subtitle handling:
        //   * `subtitle: "..."` → write trimmed value (capped at 200, mirroring
        //     the DB check constraint added in migration 214).
        //   * `subtitle: null`   → explicitly clear the column.
        //   * `subtitle: undefined` (key omitted) → leave column untouched.
        // The form always sends one of the first two so we never accidentally
        // wipe a subtitle just because the field was missing from the payload.
        const update: Record<string, unknown> = { label }
        if ('subtitle' in o) {
          if (o.subtitle === null) {
            update.subtitle = null
          } else if (typeof o.subtitle === 'string') {
            const sub = o.subtitle.trim()
            if (sub.length > 200) {
              return NextResponse.json(
                { error: 'Outcome subtitle must be 200 characters or fewer' },
                { status: 400 }
              )
            }
            update.subtitle = sub || null
          }
        }

        const { error: oErr } = await admin
          .from('market_outcomes')
          .update(update)
          .eq('id', o.id)
          .eq('market_id', id)
        if (oErr) {
          console.error('Outcome update:', oErr)
          return NextResponse.json({ error: oErr.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH market:', err)
    return NextResponse.json({ error: 'Failed to update market' }, { status: 500 })
  }
}
