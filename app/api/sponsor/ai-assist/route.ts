import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAnthropicClient, MODELS, TOKEN_LIMITS, parseAgentJSON } from '@/lib/agents/config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export type PulseAiSuggestion = {
  context: string
  options: string[]
  resolution_criteria: string
  suggested_duration_days: number
  improved_title?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const companyName =
      typeof body.companyName === 'string' ? body.companyName.trim() : 'tu empresa'

    if (!title || title.length < 10) {
      return NextResponse.json({ error: 'Title is required (at least 10 characters)' }, { status: 400 })
    }
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: account } = await admin
      .from('sponsor_accounts')
      .select('id, is_pulse_client, status')
      .eq('access_token', token)
      .eq('status', 'active')
      .maybeSingle()

    if (!account) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (account.is_pulse_client !== true) {
      return NextResponse.json({ error: 'Pulse clients only' }, { status: 403 })
    }

    const anthropic = getAnthropicClient()

    const prompt = `You are helping a company called "${companyName}" create a public opinion poll (called a "Pulse") on a collective intelligence platform. Their question/idea is:

"${title}"

Generate a complete Pulse configuration. Respond ONLY with valid JSON, no backticks or preamble:

{
  "context": "2-3 sentence Spanish description providing context for the question. Why does it matter? What should voters consider?",
  "options": ["Option 1 in Spanish", "Option 2", "Option 3", "Option 4"],
  "resolution_criteria": "How and when will this Pulse be resolved. In Spanish. Be specific.",
  "suggested_duration_days": 7,
  "improved_title": "Optionally improved version of the title in Spanish (or same if already good)"
}

Rules:
- All text in Spanish
- options should be 2-6 clear, mutually exclusive choices
- context should be informative but concise
- resolution_criteria should be objective and verifiable
- suggested_duration_days: integer 3-30
- Think about what ${companyName}'s audience would want to vote on`

    const message = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.NEWS_BRIEF,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = message.content[0]
    const responseText = block && block.type === 'text' ? block.text : ''
    const parsed = parseAgentJSON(responseText) as Record<string, unknown>

    const context = String(parsed.context ?? '').trim()
    const resolution_criteria = String(parsed.resolution_criteria ?? '').trim()
    const rawOptions = parsed.options
    const options = Array.isArray(rawOptions)
      ? rawOptions.map((o) => String(o ?? '').trim()).filter(Boolean).slice(0, 6)
      : []
    const suggested_duration_days = Math.min(
      30,
      Math.max(3, Math.round(Number(parsed.suggested_duration_days) || 7))
    )
    const improved_title = String(parsed.improved_title ?? '').trim()

    if (!context || options.length < 2) {
      return NextResponse.json({ error: 'AI returned incomplete data; try again' }, { status: 502 })
    }

    const out: PulseAiSuggestion = {
      context,
      options,
      resolution_criteria,
      suggested_duration_days,
      improved_title: improved_title || undefined,
    }

    return NextResponse.json(out)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[sponsor/ai-assist]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
