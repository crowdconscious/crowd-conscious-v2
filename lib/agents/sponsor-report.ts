import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  mexicoCityNow,
} from '@/lib/agents/config'

type Sponsorship = {
  id: string
  sponsor_name: string
  sponsor_email: string
  amount_mxn: number
  tier: string
  market_id: string | null
  category: string | null
  fund_amount: number | null
  start_date: string
}

type SponsorImpactData = {
  sponsorship: Sponsorship
  marketIds: string[]
  marketTitles: string[]
  /** Period activity: votes + trades in window */
  totalPredictions: number
  /** Current sum of engagement_count on sponsored markets (reach) */
  totalEngagementSnapshot: number
  /** Current sum of total_votes (registered) on those markets */
  registeredVotesSnapshot: number
  uniqueUsers: number
  shareCount: number
  fundAllocationMxn: number
  causesSupported: string[]
  probabilityChanges: Array<{ marketTitle: string; startProb: number; endProb: number; delta: number }>
  periodStart: string
  periodEnd: string
}

function getReportPeriod(): { start: string; end: string } {
  const now = mexicoCityNow()
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastMonth = month === 0 ? 11 : month - 1
  const lastMonthYear = month === 0 ? year - 1 : year
  const start = new Date(lastMonthYear, lastMonth, 1)
  const end = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59, 999)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export async function runSponsorReport(): Promise<{
  success: boolean
  status: 'success' | 'skipped' | 'error'
  reportsGenerated?: number
  error?: string
  tokens?: { input: number; output: number }
}> {
  const startTime = Date.now()

  try {
    const supabase = getSupabaseAdmin()

    const { data: sponsorships, error: sponsorshipsError } = await supabase
      .from('sponsorships')
      .select('id, sponsor_name, sponsor_email, amount_mxn, tier, market_id, category, fund_amount, start_date')
      .eq('status', 'active')

    if (sponsorshipsError) {
      console.error('[Sponsor Report] Failed to fetch sponsorships:', sponsorshipsError)
      await logAgentRun({
        agentName: 'sponsor-report',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: sponsorshipsError.message,
      })
      return { success: false, status: 'error', error: sponsorshipsError.message }
    }

    if (!sponsorships || sponsorships.length === 0) {
      console.log('[Sponsor Report] No active sponsorships — skipping')
      await logAgentRun({
        agentName: 'sponsor-report',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'no_active_sponsorships', count: 0 },
      })
      return { success: true, status: 'skipped', reportsGenerated: 0 }
    }

    const { start: periodStart, end: periodEnd } = getReportPeriod()

    const { data: causes } = await supabase
      .from('fund_causes')
      .select('id, name')
      .eq('active', true)
      .order('name')

    const causeNames = (causes ?? []).map((c) => c.name)

    const anthropic = getAnthropicClient()
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let reportsGenerated = 0

    for (const s of sponsorships as Sponsorship[]) {
      const impact = await gatherSponsorImpact(supabase, s, periodStart, periodEnd, causeNames)
      if (!impact) continue

      const prompt = buildPrompt(impact)

      const response = await anthropic.messages.create({
        model: MODELS.FAST,
        max_tokens: TOKEN_LIMITS.DIGEST,
        messages: [{ role: 'user', content: prompt }],
      })

      const textBlock = response.content.find((b) => b.type === 'text')
      const reportText = textBlock && 'text' in textBlock ? textBlock.text : ''

      if (!reportText) {
        console.warn(`[Sponsor Report] Empty response for ${s.sponsor_name}`)
        continue
      }

      const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }
      totalInputTokens += usage.input_tokens
      totalOutputTokens += usage.output_tokens

      const periodLabel = `${periodStart.slice(0, 7)}`
      const { error: insertErr } = await supabase.from('agent_content').insert({
        market_id: impact.marketIds[0] ?? null,
        agent_type: 'content_creator',
        content_type: 'sponsor_report',
        title: `Sponsor Impact Report — ${s.sponsor_name} (${periodLabel})`,
        body: reportText,
        language: 'en',
        metadata: {
          sponsor_id: s.id,
          sponsor_name: s.sponsor_name,
          sponsor_email: s.sponsor_email,
          period: periodLabel,
          period_start: periodStart,
          period_end: periodEnd,
          total_predictions: impact.totalPredictions,
          unique_users: impact.uniqueUsers,
          fund_allocation_mxn: impact.fundAllocationMxn,
        },
        published: false,
      })

      if (insertErr) {
        console.error(`[Sponsor Report] Failed to save report for ${s.sponsor_name}:`, insertErr)
        continue
      }

      reportsGenerated++
      console.log(`[Sponsor Report] Generated report for ${s.sponsor_name}`)
    }

    await logAgentRun({
      agentName: 'sponsor-report',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: totalInputTokens,
      tokensOutput: totalOutputTokens,
      summary: { reportsGenerated, sponsorshipsProcessed: sponsorships.length },
    })

    return {
      success: true,
      status: 'success',
      reportsGenerated,
      tokens: { input: totalInputTokens, output: totalOutputTokens },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Sponsor Report] Error:', err)
    await logAgentRun({
      agentName: 'sponsor-report',
      status: 'error',
      durationMs: Date.now() - startTime,
      errorMessage: msg,
    })
    return { success: false, status: 'error', error: msg }
  }
}

async function gatherSponsorImpact(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sponsorship: Sponsorship,
  periodStart: string,
  periodEnd: string,
  causeNames: string[]
): Promise<SponsorImpactData | null> {
  let marketIds: string[] = []
  let marketTitles: string[] = []

  if ((sponsorship.tier === 'market' || sponsorship.tier === 'starter') && sponsorship.market_id) {
    marketIds = [sponsorship.market_id]
    const { data: m } = await supabase
      .from('prediction_markets')
      .select('title')
      .eq('id', sponsorship.market_id)
      .single()
    marketTitles = m?.title ? [m.title] : []

  } else if ((sponsorship.tier === 'category' || sponsorship.tier === 'growth') && sponsorship.category) {
    const { data: markets } = await supabase
      .from('prediction_markets')
      .select('id, title')
      .eq('sponsor_id', sponsorship.id)
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
    marketIds = (markets ?? []).map((m) => m.id)
    marketTitles = (markets ?? []).map((m) => m.title ?? 'Unknown')
  } else {
    const { data: markets } = await supabase
      .from('prediction_markets')
      .select('id, title')
      .eq('sponsor_id', sponsorship.id)
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
    marketIds = (markets ?? []).map((m) => m.id)
    marketTitles = (markets ?? []).map((m) => m.title ?? 'Unknown')
  }

  if (marketIds.length === 0) {
    return {
      sponsorship,
      marketIds: [],
      marketTitles: [],
      totalPredictions: 0,
      totalEngagementSnapshot: 0,
      registeredVotesSnapshot: 0,
      uniqueUsers: 0,
      shareCount: 0,
      fundAllocationMxn: Number(sponsorship.fund_amount ?? 0),
      causesSupported: causeNames,
      probabilityChanges: [],
      periodStart,
      periodEnd,
    }
  }

  const [
    { data: marketVotes },
    { data: trades },
    { data: history },
  ] = await Promise.all([
    supabase
      .from('market_votes')
      .select('user_id')
      .in('market_id', marketIds)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd),
    supabase
      .from('prediction_trades')
      .select('user_id')
      .in('market_id', marketIds)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd),
    supabase
      .from('prediction_market_history')
      .select('market_id, probability, recorded_at')
      .in('market_id', marketIds)
      .gte('recorded_at', periodStart)
      .lte('recorded_at', periodEnd)
      .order('recorded_at', { ascending: true }),
  ])

  const uniqueUsers = new Set<string>()
  for (const v of marketVotes ?? []) {
    if (v.user_id) uniqueUsers.add(v.user_id)
  }
  for (const t of trades ?? []) {
    if (t.user_id) uniqueUsers.add(t.user_id)
  }

  const totalPredictions = (marketVotes?.length ?? 0) + (trades?.length ?? 0)

  let totalEngagementSnapshot = 0
  let registeredVotesSnapshot = 0
  if (marketIds.length) {
    const { data: pm } = await supabase
      .from('prediction_markets')
      .select('engagement_count, total_votes')
      .in('id', marketIds)
    for (const row of pm ?? []) {
      const r = row as { engagement_count?: number | null; total_votes?: number | null }
      totalEngagementSnapshot += Number(r.engagement_count ?? r.total_votes ?? 0)
      registeredVotesSnapshot += Number(r.total_votes ?? 0)
    }
  }

  const probabilityChanges: SponsorImpactData['probabilityChanges'] = []
  for (const mid of marketIds) {
    const hist = (history ?? []).filter((h) => h.market_id === mid)
    if (hist.length >= 2) {
      const first = hist[0]
      const last = hist[hist.length - 1]
      const startProb = Number(first.probability ?? 0)
      const endProb = Number(last.probability ?? 0)
      const title = marketTitles[marketIds.indexOf(mid)] ?? mid
      probabilityChanges.push({
        marketTitle: title,
        startProb,
        endProb,
        delta: endProb - startProb,
      })
    }
  }

  const fundAllocationMxn = Number(sponsorship.fund_amount ?? 0)

  return {
    sponsorship,
    marketIds,
    marketTitles,
    totalPredictions,
    totalEngagementSnapshot,
    registeredVotesSnapshot,
    uniqueUsers: uniqueUsers.size,
    shareCount: 0,
    fundAllocationMxn,
    causesSupported: causeNames,
    probabilityChanges,
    periodStart,
    periodEnd,
  }
}

function buildPrompt(data: SponsorImpactData): string {
  const s = data.sponsorship
  const marketOrCategory =
    data.marketTitles.length > 0
      ? data.marketTitles.join(', ')
      : (s.tier === 'category' || s.tier === 'growth') && s.category
        ? `category "${s.category}"`
        : 'their sponsored market(s)'

  return `Generate a sponsor impact report for ${s.sponsor_name}.

Their $${Number(s.amount_mxn).toLocaleString()} MXN sponsorship of ${marketOrCategory} — headline reach:
- ${data.totalEngagementSnapshot.toLocaleString()} total engagements (all interactions on sponsored markets today — registered + anonymous)
- ${data.registeredVotesSnapshot.toLocaleString()} registered voters shaping community probability
- ${data.totalPredictions} prediction interactions in the reporting period (votes + trades in window)
- ${data.uniqueUsers} unique users who interacted in the period
- $${data.fundAllocationMxn.toLocaleString()} MXN was allocated to the Conscious Fund, supporting these causes: ${data.causesSupported.join(', ') || 'community causes'}

${data.probabilityChanges.length > 0 ? `Probability changes on their markets (registered-voter signal):` : ''}
${data.probabilityChanges.map((p) => `- ${p.marketTitle}: ${p.startProb.toFixed(0)}% → ${p.endProb.toFixed(0)}% (${p.delta >= 0 ? '+' : ''}${p.delta.toFixed(0)}%)`).join('\n')}

Footnote for accuracy: Total engagements include registered and anonymous community members. Community probability shown in the product is derived from registered users only for data integrity.

Write a professional 3-paragraph summary emphasizing the brand's impact. Include specific numbers. Be concise and celebratory. Write in English.`;
}
