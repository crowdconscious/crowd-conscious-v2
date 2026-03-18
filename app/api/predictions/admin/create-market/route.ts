import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

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
    } = body

    if (!title?.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!resolution_date) {
      return Response.json({ error: 'Resolution date is required' }, { status: 400 })
    }

    const validCategories = [
      'world_cup',
      'world',
      'government',
      'sustainability',
      'corporate',
      'community',
      'cause',
    ]
    if (!category || !validCategories.includes(category)) {
      return Response.json({ error: 'Valid category is required' }, { status: 400 })
    }

    const prob = Math.min(
      99,
      Math.max(1, Number(initial_probability) || 50)
    )
    const fundPct = Math.min(100, Math.max(0, Number(conscious_fund_percentage) ?? 7.5))
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

    if (market_type === 'multi' && Array.isArray(outcomes) && outcomes.length >= 2) {
      const outcomeLabels = outcomes
        .map((o) => (typeof o === 'string' ? o : o?.label || o?.name)?.trim())
        .filter(Boolean)
      if (outcomeLabels.length < 2) {
        return Response.json({ error: 'Multi-choice requires at least 2 options' }, { status: 400 })
      }

      const { data: marketId, error: rpcError } = await admin.rpc('create_multi_market', {
        p_title: title.trim(),
        p_description: description?.trim() || null,
        p_category: category,
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
        resolution_criteria: resolution_criteria?.trim() || 'Standard resolution',
        verification_sources: verificationStrings,
        tags: tagArray,
        metadata,
        conscious_fund_percentage: fundPct,
        sponsor_contribution: sponsorAmount,
        current_probability: 100 / outcomeLabels.length,
      }
      if (translations && typeof translations === 'object') updatePayload.translations = translations
      await admin.from('prediction_markets').update(updatePayload).eq('id', marketId)

      // Auto-apply active category sponsor if one exists for this category
      const { data: categorySponsor } = await admin
        .from('sponsorships')
        .select('id, sponsor_name, sponsor_logo_url, sponsor_url')
        .eq('category', category)
        .eq('tier', 'category')
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
        message: 'Market created successfully',
      })
    }

    const { data: marketId, error: rpcError } = await admin.rpc('create_binary_market', {
      p_title: title.trim(),
      p_description: description?.trim() || null,
      p_category: category,
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
      resolution_criteria: resolution_criteria?.trim() || null,
      verification_sources: verificationStrings,
      tags: tagArray,
      metadata,
      current_probability: prob,
      conscious_fund_percentage: fundPct,
      sponsor_contribution: sponsorAmount,
    }
    if (translations && typeof translations === 'object') updatePayload.translations = translations
    await admin.from('prediction_markets').update(updatePayload).eq('id', marketId)

    // Auto-apply active category sponsor if one exists for this category
    const { data: categorySponsor } = await admin
      .from('sponsorships')
      .select('id, sponsor_name, sponsor_logo_url, sponsor_url')
      .eq('category', category)
      .eq('tier', 'category')
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
      message: 'Market created successfully',
    })
  } catch (err) {
    console.error('Create market error:', err)
    return Response.json({ error: 'Failed to create market' }, { status: 500 })
  }
}
