import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not set', keyExists: false })
  }

  const client = new Anthropic({ apiKey })

  // Test models in order — stop after first success
  const models = [
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022',
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-5-20241022', // Old wrong ID for comparison
  ]

  const results: Array<{
    model: string
    status: 'success' | 'error'
    response?: string
    usage?: unknown
    error?: number
    message?: string
  }> = []

  for (const model of models) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
      })
      results.push({
        model,
        status: 'success',
        response:
          response.content[0]?.type === 'text'
            ? (response.content[0] as { text: string }).text
            : 'non-text',
        usage: response.usage,
      })
      break // Stop after first successful model
    } catch (err: unknown) {
      const e = err as { status?: number; error?: { error?: { message?: string }; message?: string }; message?: string }
      results.push({
        model,
        status: 'error',
        error: e?.status,
        message: e?.error?.error?.message ?? e?.error?.message ?? e?.message ?? String(err),
      })
    }
  }

  return Response.json({
    keyPrefix: apiKey.substring(0, 15) + '...',
    results,
    timestamp: new Date().toISOString(),
  })
}

export const maxDuration = 30
