import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import {
  isValidMarketCategory,
  PULSE_DEFAULT_RESOLUTION_CRITERIA,
  pulseDefaultEndDateIso,
} from '@/lib/market-categories'
import { isAdminUser } from '@/lib/auth/is-admin'
import { notifyPulsePublished } from '@/lib/expo-push'
import {
  normalizePulseOutcomes,
  outcomeTranslationsPayload,
} from '@/lib/pulse/outcome-input'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, email')
      .eq('id', user.id)
      .single()

    if (!isAdminUser(profile)) {
      return Response.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      description_short,
      category,
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

    if (!resolvedDescriptionShort) {
      return Response.json(
        { error: 'La descripción corta es obligatoria para nuevos Pulses.' },
        { status: 400 }
      )
    }

    const categoryResolved = String(category ?? 'community').trim()
    if (!categoryResolved || !isValidMarketCategory(categoryResolved)) {
      return Response.json({ error: 'Valid category is required' }, { status: 400 })
    }

    const normalizedOutcomes = normalizePulseOutcomes(outcomes)
    if (normalizedOutcomes.length < 2) {
      return Response.json(
        { error: 'Un Pulse requiere al menos 2 opciones de comunidad con título.' },
        { status: 400 }
      )
    }

    const fundPct = Math.min(100, Math.max(0, Number(conscious_fund_percentage) ?? 20))
    const sponsorAmount = Number(sponsorship_amount_mxn) || 0
    const endDateIso = pulseDefaultEndDateIso()

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

    let resolvedSponsorAccountId: string | null = null
    if (typeof sponsor_account_id === 'string' && sponsor_account_id.trim()) {
      const { data: sponsorAcct, error: saErr } = await admin
        .from('sponsor_accounts')
        .select('id, company_name, contact_email, logo_url, status')
        .eq('id', sponsor_account_id.trim())
        .maybeSingle()
      if (saErr || !sponsorAcct) {
        return Response.json({ error: 'Sponsor account not found' }, { status: 400 })
      }
      resolvedSponsorAccountId = sponsorAcct.id
    }

    const outcomeLabels = normalizedOutcomes.map((o) => o.title)

    const { data: marketId, error: rpcError } = await admin.rpc('create_multi_market', {
      p_title: title.trim(),
      p_description: description?.trim() || null,
      p_category: categoryResolved,
      p_created_by: user.id,
      p_end_date: endDateIso,
      p_outcomes: outcomeLabels,
      p_sponsor_name: sponsor_name?.trim() || null,
      p_sponsor_logo_url: sponsor_logo_url?.trim() || null,
      p_image_url: null,
      p_resolution_criteria: PULSE_DEFAULT_RESOLUTION_CRITERIA,
    })

    if (rpcError) {
      console.error('Create pulse error:', rpcError)
      return Response.json({ error: rpcError.message }, { status: 500 })
    }

    const updatePayload: Record<string, unknown> = {
      description: description?.trim() || null,
      description_short: resolvedDescriptionShort,
      resolution_criteria: PULSE_DEFAULT_RESOLUTION_CRITERIA,
      verification_sources: verificationStrings,
      tags: tagArray,
      metadata,
      conscious_fund_percentage: fundPct,
      sponsor_contribution: sponsorAmount,
      current_probability: 100 / outcomeLabels.length,
      is_draft: wantsDraft,
      published_at: wantsDraft ? null : new Date().toISOString(),
      sponsor_account_id: resolvedSponsorAccountId,
      is_pulse: true,
      pulse_client_name:
        typeof pulse_client_name === 'string' ? pulse_client_name.trim() || null : null,
      pulse_client_logo:
        typeof pulse_client_logo === 'string' ? pulse_client_logo.trim() || null : null,
      pulse_client_email:
        typeof pulse_client_email === 'string' ? pulse_client_email.trim() || null : null,
      pulse_embed_enabled: false,
    }
    if (translations && typeof translations === 'object') updatePayload.translations = translations
    if (typeof cover_image_url === 'string') {
      updatePayload.cover_image_url = cover_image_url.trim() || null
    }
    await admin.from('prediction_markets').update(updatePayload).eq('id', marketId)

    const hasSubtitlesOrTranslations = normalizedOutcomes.some(
      (o) => o.subtitle !== null || o.labelEn !== null || o.subtitleEn !== null
    )
    if (hasSubtitlesOrTranslations) {
      const { data: createdOutcomes } = await admin
        .from('market_outcomes')
        .select('id, sort_order')
        .eq('market_id', marketId)
        .order('sort_order', { ascending: true })
      if (createdOutcomes) {
        for (let i = 0; i < normalizedOutcomes.length; i++) {
          const o = normalizedOutcomes[i]
          const row = createdOutcomes.find((r) => (r.sort_order ?? 0) === i)
          if (!row) continue
          const patch: Record<string, unknown> = {}
          if (o.subtitle !== null) patch.subtitle = o.subtitle
          const tr = outcomeTranslationsPayload(o.labelEn, o.subtitleEn)
          if (tr) patch.translations = tr
          if (Object.keys(patch).length === 0) continue
          const { error: subErr } = await admin.from('market_outcomes').update(patch).eq('id', row.id)
          if (subErr) {
            console.error('Outcome subtitle/translation write failed:', subErr)
          }
        }
      }
    }

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

    if (!wantsDraft) {
      void notifyPulsePublished(admin, {
        marketId: marketId as string,
        title: title.trim(),
        mode: 'announce',
      }).catch((err) => console.warn('[create-market] pulse push error:', err))
    }

    return Response.json({
      success: true,
      market_id: marketId,
      is_draft: wantsDraft,
      message: 'Pulse created successfully',
    })
  } catch (err) {
    console.error('Create pulse error:', err)
    return Response.json({ error: 'Failed to create pulse' }, { status: 500 })
  }
}
