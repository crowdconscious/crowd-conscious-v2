import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { getAnthropicClient, MODELS } from '@/lib/agents/config'

/**
 * POST /api/predictions/admin/suggest-criteria
 * Suggests resolution criteria for a market based on title and description.
 * Admin only.
 */
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
    const { title, description } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: MODELS.FAST,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are helping create a prediction market. Given the market title and optional description, write clear, verifiable resolution criteria.

Title: ${title.trim()}
${description?.trim() ? `Description/Context: ${description.trim()}` : ''}

Write resolution criteria that:
1. Are specific and measurable
2. Specify exactly when the market resolves YES vs NO
3. Reference a data source or authority when possible (e.g., "according to Banxico", "official FIFA results")
4. Include a date or deadline if relevant

Respond with ONLY the resolution criteria text, no preamble or explanation. Keep it concise (2-4 sentences). Use Spanish if the title is in Spanish, otherwise English.`,
        },
      ],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const suggested = text.trim()

    return Response.json({ suggested })
  } catch (err) {
    console.error('Suggest criteria error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to suggest criteria' },
      { status: 500 }
    )
  }
}
