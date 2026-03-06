import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  parseAgentJSON,
} from '@/lib/agents/config'

export async function runInboxCurator(): Promise<{
  success: boolean
  error?: string
  skipped?: boolean
  summary?: { pending_count: number; top_recommendation?: string }
}> {
  const startTime = Date.now()

  try {
    const supabase = getSupabaseAdmin()

    const { data: pendingItems, error: pendingErr } = await supabase
      .from('conscious_inbox')
      .select('id, type, title, description, category, upvotes, created_at')
      .eq('status', 'pending')
      .order('upvotes', { ascending: false })

    if (pendingErr) {
      throw new Error(`Failed to fetch pending items: ${pendingErr.message}`)
    }

    const pending = (pendingItems ?? []) as Array<{
      id: string
      type: string
      title: string
      description: string | null
      category: string | null
      upvotes: number
      created_at: string
    }>

    if (pending.length === 0) {
      await logAgentRun({
        agentName: 'inbox-curator',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { pending_count: 0, reason: 'No pending items' },
      })
      return { success: true, skipped: true, summary: { pending_count: 0 } }
    }

    const { data: activeMarkets } = await supabase
      .from('prediction_markets')
      .select('title')
      .in('status', ['active', 'trading'])

    const activeTitles = (activeMarkets ?? []).map((m) => m.title)

    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentDecisions } = await supabase
      .from('conscious_inbox')
      .select('title, status')
      .in('status', ['approved', 'rejected'])
      .gte('updated_at', cutoff7d)

    const recentDecisionsList = (recentDecisions ?? []).map((r) => ({
      title: r.title,
      status: r.status,
    }))

    const anthropic = getAnthropicClient()

    const systemMessage = `You are the community curator for Crowd Conscious, a free-to-play opinion platform in Mexico City. Your job is to review user-submitted ideas and help the admin decide which ones to act on. Be practical — the platform has limited bandwidth. Prioritize ideas that would drive engagement, are timely, and align with the platform categories (World Cup, World, Government, Sustainability, Corporate, Community, Cause).`

    const userMessage = `Here are the pending community submissions (sorted by upvotes):
${JSON.stringify(pending, null, 2)}

Currently active markets (avoid duplicates):
${JSON.stringify(activeTitles, null, 2)}

Recently approved/rejected (admin's taste):
${JSON.stringify(recentDecisionsList, null, 2)}

For each pending submission, provide:
1. relevance_score (1-10): based on timeliness, engagement potential, upvote count
2. recommendation: one of 'create_market', 'add_to_fund', 'needs_editing', 'merge_with_existing', 'not_suitable'
3. reason: 1 sentence explaining why
4. If 'create_market': suggest resolution_criteria and resolution_date
5. If 'merge_with_existing': which existing market title it overlaps with

Return as JSON array sorted by relevance_score descending.
Write reasons in Spanish.`

    const response = await anthropic.messages.create({
      model: MODELS.FAST,
      max_tokens: TOKEN_LIMITS.DIGEST,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    let analysis: unknown[]
    try {
      const parsed = parseAgentJSON(rawText)
      analysis = Array.isArray(parsed) ? parsed : [parsed]
    } catch (e) {
      throw new Error(`JSON parse failed: ${String(e)}`)
    }

    const topItem = analysis[0] as Record<string, unknown> | undefined
    let topRecommendation: string = String(topItem?.title ?? topItem?.submission_title ?? '')
    if (!topRecommendation && topItem?.id) {
      const match = pending.find((p) => p.id === topItem.id)
      topRecommendation = match?.title ?? String(topItem.id)
    }

    try {
      await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'news_monitor',
        content_type: 'weekly_digest',
        title: 'Inbox Curator Digest',
        body: JSON.stringify(analysis),
        language: 'es',
        metadata: {
          type: 'inbox_digest',
          pending_count: pending.length,
          top_recommendation: topRecommendation || undefined,
          model: MODELS.FAST,
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
        },
        published: false,
      })
    } catch (e) {
      console.error('Failed to save inbox digest:', e)
    }

    await logAgentRun({
      agentName: 'inbox-curator',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: {
        pending_count: pending.length,
        top_recommendation: topRecommendation,
      },
    })

    return {
      success: true,
      summary: {
        pending_count: pending.length,
        top_recommendation: topRecommendation,
      },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Inbox curator agent error:', err)

    try {
      await logAgentRun({
        agentName: 'inbox-curator',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: err.message,
        summary: {},
      })
    } catch (logErr) {
      console.error('Failed to log agent run:', logErr)
    }

    return { success: false, error: err.message }
  }
}
