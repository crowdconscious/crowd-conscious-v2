import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAnthropicClient, MODELS, parseAgentJSON } from '@/lib/agents/config'

export const maxDuration = 30

/**
 * Admin-only endpoint that produces a 3-bullet TL;DR (ES + EN) from a
 * post's title + body. Used by the blog form's "Sugerir TL;DR con IA"
 * button so editors don't have to hand-write the hook for every article.
 *
 * We use Haiku (fast/cheap) because TL;DR generation is a pure
 * summarization task — no need for Sonnet's creativity budget.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as {
      title?: string
      title_en?: string
      content?: string
      content_en?: string
      pulse_question?: string | null
    }

    const title = String(body.title ?? '').trim()
    const content = String(body.content ?? '').trim()
    if (!title || !content) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 })
    }

    const titleEn = String(body.title_en ?? '').trim() || null
    const contentEn = String(body.content_en ?? '').trim() || null
    const pulseQuestion = String(body.pulse_question ?? '').trim() || null

    const client = getAnthropicClient()

    const prompt = `Eres un editor que escribe TL;DRs cortísimos para lectores mexicanos en mobile. Tu tarea: convertir un artículo de blog en 3 bullets cortos (máximo 12 palabras cada uno) que digan exactamente qué pasa, por qué importa y qué hacer ahora.

REGLAS:
- 3 bullets. No 4. No 2. Tres.
- Cada bullet ≤ 12 palabras.
- Voz directa, presente. Sin marketing. Sin emojis. Sin signos de exclamación.
- El último bullet siempre incluye una acción (vota, lee, regístrate, etc.) cuando aplique.
- Cita números reales si aparecen en el texto (votos, fechas, porcentajes).
${pulseQuestion ? `- El artículo invita a votar en un Pulse con esta pregunta: "${pulseQuestion}". Refleja eso en el bullet final.` : ''}

Devuelve SOLO un objeto JSON con esta forma exacta (sin explicaciones, sin markdown):

{
  "tldr_es": "Bullet 1.\\nBullet 2.\\nBullet 3.",
  "tldr_en": "Bullet 1.\\nBullet 2.\\nBullet 3."
}

Cada TL;DR es un string con bullets separados por '\\n'. NO incluyas guiones ni viñetas — solo el texto del bullet.

ARTÍCULO (español):
Título: ${title}

${content.slice(0, 6000)}

${contentEn ? `\nARTÍCULO (inglés):\nTitle: ${titleEn ?? title}\n\n${contentEn.slice(0, 6000)}` : `\n(El inglés debe ser una traducción fiel del TL;DR español.)`}`

    const t0 = Date.now()
    const response = await client.messages.create({
      model: MODELS.FAST,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })
    const durationMs = Date.now() - t0

    const text = response.content
      .map((b) => (b.type === 'text' && 'text' in b ? b.text : ''))
      .join('\n')
      .trim()

    let parsed: { tldr_es?: string; tldr_en?: string } | null = null
    try {
      const result = parseAgentJSON(text)
      parsed = Array.isArray(result) ? result[0] : result
    } catch {
      parsed = null
    }

    if (!parsed?.tldr_es) {
      console.error('[suggest-tldr] could not parse Claude output:', text.slice(0, 200))
      return NextResponse.json(
        { error: 'Could not parse model output. Try again or write it manually.' },
        { status: 502 }
      )
    }

    const cleanLines = (raw: string) =>
      raw
        .split(/\r?\n+/)
        .map((l) => l.replace(/^\s*[-*•·]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 5)
        .join('\n')

    return NextResponse.json({
      ok: true,
      tldr_es: cleanLines(parsed.tldr_es),
      tldr_en: parsed.tldr_en ? cleanLines(parsed.tldr_en) : '',
      duration_ms: durationMs,
      tokens_input: response.usage?.input_tokens ?? 0,
      tokens_output: response.usage?.output_tokens ?? 0,
    })
  } catch (err) {
    console.error('[suggest-tldr]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
