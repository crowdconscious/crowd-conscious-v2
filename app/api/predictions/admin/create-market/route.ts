import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { isValidMarketCategory } from '@/lib/market-categories'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      description_short,
      category,
      initial_probability,
      resolution_date,
      resolution_criteria,
      market_type,
      outcomes,
      verification_sources,
      tags,
      links,
      related_market_ids,
      sponsor_name,
      sponsor_logo_url,
      sponsorship_amount_mxn,
      conscious_fund_percentage,
      translations,
      is_pulse,
      pulse_client_name,
      pulse_client_logo,
      pulse_client_email,
      sponsor_account_id,
      cover_image_url,
      is_draft,
    } = body

    const wantsDraft = Boolean(is_draft)

    if (!title?.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!resolution_date) {
      return Response.json({ error: 'Resolution date is required' }, { status: 400 })
    }
    // Mirror the DB check constraint from migration 215. The form already
    // caps + counts; this is defense-in-depth so an out-of-band caller
    // (script, RPC test) gets a useful 400 instead of a Postgres 500.
    let resolvedDescriptionShort: string | null = null
    if (typeof description_short === 'string') {
      const trimmed = description_short.trim()
      if (trimmed.length > 280) {
        return Response.json(
          { error: 'description_short must be 280 characters or fewer' },
          { status: 400 }
        )
      }
      resolvedDescriptionShort = trimmed || null
    }

    const categoryResolved: string = Boolean(is_pulse) ? 'pulse' : String(category ?? '').trim()
    if (!categoryResolved || !isValidMarketCategory(categoryResolved)) {
      return Response.json({ error: 'Valid category is required' }, { status: 400 })
    }

    const prob = Math.min(
      99,
      Math.max(1, Number(initial_probability) || 50)
    )
    const fundPct = Math.min(100, Math.max(0, Number(conscious_fund_percentage) ?? 20))
    const sponsorAmount = Number(sponsorship_amount_mxn) || 0

    const verificationStrings: string[] = []
    if (Array.isArray(verification_sources)) {
      for (const s of verification_sources) {
        const name = (typeof s === 'object' ? s?.name : s)?.trim?.() || ''
        const url = (typeof s === 'object' ? s?.url : '')?.trim?.() || ''
        if (name) verificationStrings.push(url ? `${name} (${url})` : name)
      }
    }

    const tagArray: string[] = []
    if (typeof tags === 'string') {
      tagArray.push(
        ...tags
          .split(/[,;]/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      )
    } else if (Array.isArray(tags)) {
      tagArray.push(...tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))
    }

    const linksArray = Array.isArray(links)
      ? links.filter((l) => l?.url?.trim()).map((l) => ({ url: l.url.trim(), label: l.label?.trim() || l.url }))
      : []

    const relatedIds = Array.isArray(related_market_ids)
      ? related_market_ids.filter((id) => typeof id === 'string' && id.length > 0)
      : []

    const metadata: Record<string, unknown> = {}
    if (linksArray.length > 0) metadata.links = linksArray
    if (relatedIds.length > 0) metadata.related_market_ids = relatedIds

    const admin = createAdminClient()

    // Resolve and validate the sponsor account binding. The form sends the
    // sponsor_accounts.id directly; we verify it exists before writing it
    // onto prediction_markets.sponsor_account_id (FK with ON DELETE SET NULL).
    let resolvedSponsorAccountId: string | null = null
    if (typeof sponsor_account_id === 'string' && sponsor_account_id.trim()) {
      const { data: sponsorAcct, error: saErr } = await admin
        .from('sponsor_accounts')
        .select('id, company_name, contact_email, logo_url, status')
        .eq('id', sponsor_account_id.trim())
        .maybeSingle()
      if (saErr || !sponsorAcct) {
        return Response.json(
          { error: 'Sponsor account not found' },
          { status: 400 }
        )
      }
      resolvedSponsorAccountId = sponsorAcct.id
    }

    const pulseFields = (() => {
      const pulse = Boolean(is_pulse)
      if (!pulse) {
        return {
          is_pulse: false,
          pulse_client_name: null as string | null,
          pulse_client_logo: null as string | null,
          pulse_client_email: null as string | null,
          pulse_embed_enabled: false,
        }
      }
      return {
        is_pulse: true,
        pulse_client_name:
          typeof pulse_client_name === 'string' ? pulse_client_name.trim() || null : null,
        pulse_client_logo:
          typeof pulse_client_logo === 'string' ? pulse_client_logo.trim() || null : null,
        pulse_client_email:
          typeof pulse_client_email === 'string' ? pulse_client_email.trim() || null : null,
        pulse_embed_enabled: false,
      }
    })()

    if (market_type === 'multi' && Array.isArray(outcomes) && outcomes.length >= 2) {
      // Outcomes can arrive in three shapes for backwards compatibility:
      //   1. The new structured shape: { title, subtitle? }      ← admin UI
      //   2. The old structured shape: { label, name? }          ← legacy callers
      //   3. A bare string                                       ← scripts / RPC tests
      // After this normalization we have a parallel array of titles + optional
      // subtitles, indexed the same way the create_multi_market RPC will insert
      // them (sort_order 0..N-1, in array order).
      type OutcomeInput = {
        title: string | null
        subtitle: string | null
      }
      const normalizedOutcomes: OutcomeInput[] = outcomes
        .map((o): OutcomeInput | null => {
          if (typeof o === 'string') {
            const t = o.trim()
            return t ? { title: t, subtitle: null } : null
          }
          if (o && typeof o === 'object') {
            const titleRaw =
              (typeof o.title === 'string' ? o.title : '') ||
              (typeof o.label === 'string' ? o.label : '') ||
              (typeof o.name === 'string' ? o.name : '')
            const subRaw = typeof o.subtitle === 'string' ? o.subtitle : ''
            const title = titleRaw.trim()
            if (!title) return null
            const subtitle = subRaw.trim()
            if (subtitle.length > 200) {
              // Mirror the DB check constraint so we fail with a useful message
              // instead of a 500 from Postgres.
              return null
            }
            return { title, subtitle: subtitle || null }
          }
          return null
        })
        .filter((o): o is OutcomeInput => o !== null && !!o.title)

      if (normalizedOutcomes.length < 2) {
        return Response.json(
          {
            error:
              'Multi-choice requires at least 2 options (each with a non-empty title up to 80 chars and an optional subtitle up to 200 chars).',
          },
          { status: 400 }
        )
      }

      const outcomeLabels = normalizedOutcomes.map((o) => o.title as string)

      const { data: marketId, error: rpcError } = await admin.rpc('create_multi_market', {
        p_title: title.trim(),
        p_description: description?.trim() || null,
        p_category: categoryResolved,
        p_created_by: user.id,
        p_end_date: resolution_date,
        p_outcomes: outcomeLabels,
        p_sponsor_name: sponsor_name?.trim() || null,
        p_sponsor_logo_url: sponsor_logo_url?.trim() || null,
        p_image_url: null,
        p_resolution_criteria: resolution_criteria?.trim() || null,
      })

      if (rpcError) {
        console.error('Create multi market error:', rpcError)
        return Response.json({ error: rpcError.message }, { status: 500 })
      }

      const updatePayload: Record<string, unknown> = {
        description: description?.trim() || 'Standard description',
        description_short: resolvedDescriptionShort,
        resolution_criteria: resolution_criteria?.trim() || 'Standard resolution',
        verification_sources: verificationStrings,
        tags: tagArray,
        metadata,
        conscious_fund_percentage: fundPct,
        sponsor_contribution: sponsorAmount,
        current_probability: 100 / outcomeLabels.length,
        is_draft: wantsDraft,
        published_at: wantsDraft ? null : new Date().toISOString(),
        sponsor_account_id: resolvedSponsorAccountId,
      }
      if (translations && typeof translations === 'object') updatePayload.translations = translations
      Object.assign(updatePayload, pulseFields)
      if (typeof cover_image_url === 'string') {
        updatePayload.cover_image_url = cover_image_url.trim() || null
      }
      await admin.from('prediction_markets').update(updatePayload).eq('id', marketId)

      // Persist optional subtitles on the just-created outcomes. The RPC
      // `create_multi_market` inserts them in array order with sort_order
      // starting at 0, so we can match the input array index back to a row
      // by sort_order. We only update when at least one subtitle was given;
      // otherwise we save a network round-trip.
      const hasAnySubtitle = normalizedOutcomes.some((o) => o.subtitle !== null)
      if (hasAnySubtitle) {
        const { data: createdOutcomes } = await admin
          .from('market_outcomes')
          .select('id, sort_order')
          .eq('market_id', marketId)
          .order('sort_order', { ascending: true })
        if (createdOutcomes) {
          for (let i = 0; i < normalizedOutcomes.length; i++) {
            const sub = normalizedOutcomes[i].subtitle
            if (sub === null) continue
            const row = createdOutcomes.find((r) => (r.sort_order ?? 0) === i)
            if (!row) continue
            const { error: subErr } = await admin
              .from('market_outcomes')
              .update({ subtitle: sub })
              .eq('id', row.id)
            if (subErr) {
              // Soft-fail: the market and outcomes exist; the admin can fix
              // subtitles via the edit form. Don't 500 the whole request.
              console.error('Outcome subtitle write failed:', subErr)
            }
          }
        }
      }

      // Auto-apply active category sponsor if one exists for this category
      const { data: categorySponsor } = await admin
        .from('sponsorships')
        .select('id, sponsor_name, sponsor_logo_url, sponsor_url')
        .eq('category', categoryResolved)
        .in('tier', ['category', 'growth'])
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (categorySponsor) {
        await admin
          .from('prediction_markets')
          .update({
            sponsor_id: categorySponsor.id,
            sponsor_name: categorySponsor.sponsor_name,
            sponsor_logo_url: categorySponsor.sponsor_logo_url,
            sponsor_url: categorySponsor.sponsor_url,
          })
          .eq('id', marketId)
      }

      return Response.json({
        success: true,
        market_id: marketId,
        is_draft: wantsDraft,
        message: 'Market created successfully',
      })
    }

    const { data: marketId, error: rpcError } = await admin.rpc('create_binary_market', {
      p_title: title.trim(),
      p_description: description?.trim() || null,
      p_category: categoryResolved,
      p_created_by: user.id,
      p_end_date: resolution_date,
      p_sponsor_name: sponsor_name?.trim() || null,
      p_sponsor_logo_url: sponsor_logo_url?.trim() || null,
      p_image_url: null,
      p_resolution_criteria: resolution_criteria?.trim() || null,
    })

    if (rpcError) {
      console.error('Create binary market error:', rpcError)
      return Response.json({ error: rpcError.message }, { status: 500 })
    }

    const updatePayload: Record<string, unknown> = {
      description: description?.trim() || null,
      description_short: resolvedDescriptionShort,
      resolution_criteria: resolution_criteria?.trim() || null,
      verification_sources: verificationStrings,
      tags: tagArray,
      metadata,
      current_probability: prob,
      conscious_fund_percentage: fundPct,
      sponsor_contribution: sponsorAmount,
      is_draft: wantsDraft,
      published_at: wantsDraft ? null : new Date().toISOString(),
      sponsor_account_id: resolvedSponsorAccountId,
    }
    if (translations && typeof translations === 'object') updatePayload.translations = translations
    Object.assign(updatePayload, pulseFields)
    if (typeof cover_image_url === 'string') {
      updatePayload.cover_image_url = cover_image_url.trim() || null
    }
    await admin.from('prediction_markets').update(updatePayload).eq('id', marketId)

    // Auto-apply active category sponsor if one exists for this category
    const { data: categorySponsor } = await admin
      .from('sponsorships')
      .select('id, sponsor_name, sponsor_logo_url, sponsor_url')
      .eq('category', categoryResolved)
        .in('tier', ['category', 'growth'])
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (categorySponsor) {
      await admin
        .from('prediction_markets')
        .update({
          sponsor_id: categorySponsor.id,
          sponsor_name: categorySponsor.sponsor_name,
          sponsor_logo_url: categorySponsor.sponsor_logo_url,
          sponsor_url: categorySponsor.sponsor_url,
        })
        .eq('id', marketId)
    }

    return Response.json({
      success: true,
      market_id: marketId,
      is_draft: wantsDraft,
      message: 'Market created successfully',
    })
  } catch (err) {
    console.error('Create market error:', err)
    return Response.json({ error: 'Failed to create market' }, { status: 500 })
  }
}
