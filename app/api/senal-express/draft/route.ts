import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type {
  Message,
  MessageParam,
} from '@anthropic-ai/sdk/resources/messages/messages'
import { getCurrentUserFromRequest } from '@/lib/auth-server'
import {
  getAnthropicClient,
  MODELS,
  parseAgentJSON,
  logAgentRun,
} from '@/lib/agents/config'
import {
  senalExpressDraftRateLimit,
  getSenalExpressIdentifier,
} from '@/lib/rate-limit'
import { LAUNCH_ALCALDIAS, getAlcaldiaMeta } from '@/lib/geo/cdmx'
import { EXPRESS_CATEGORIES } from '@/lib/senal-express/category-map'
import {
  OFICIO_SYSTEM_PROMPT,
  OFICIO_RETRY_REMINDER,
  buildOficioUserPrompt,
  DRAFT_TEMPERATURE,
  DRAFT_MAX_TOKENS,
} from '@/lib/senal-express/prompt'
import { validateOficioDraft } from '@/lib/senal-express/validator'
import {
  createExpressAdminClient,
  insertExpressOficio,
} from '@/lib/senal-express/db'
import type { ExpressDraft, DraftResponseBody } from '@/lib/senal-express/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/senal-express/draft (§7.1)
 *
 * Kill switch: SENAL_EXPRESS_ENABLED !== 'true' ⇒ 503 (invisible feature, not an
 * error state — the /queja page shows a coming-soon screen).
 *
 * Turns a citizen's sentence + location + category into a formal Mexican-Spanish
 * oficio via MODELS.CREATIVE (low temperature), returned as strict JSON. The
 * no-laws / no-named-individuals guardrail is enforced BOTH in the system prompt
 * AND by a deterministic post-parse validator (lib/senal-express/validator.ts):
 * on any violation we retry ONCE with a stricter reminder, then fail. Persists a
 * `status='draft'` express_oficios row. Rate-limited to 3/day per identity.
 */

function flagOn() {
  return process.env.SENAL_EXPRESS_ENABLED === 'true'
}

const draftBodySchema = z.object({
  deviceId: z.string().trim().max(128).optional().default(''),
  alcaldia: z.enum(LAUNCH_ALCALDIAS),
  category: z.enum(EXPRESS_CATEGORIES),
  sentence: z.string().trim().min(15).max(400),
  colonia: z.string().trim().max(120).nullable().optional(),
  streetReference: z.string().trim().max(160).nullable().optional(),
  hasPhoto: z.boolean().optional().default(false),
  locale: z.enum(['es', 'en']).optional().default('es'),
})

function extractText(message: Message): string {
  return message.content
    .filter(
      (b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text'
    )
    .map((b) => b.text)
    .join('')
    .trim()
}

/** Coerce parseAgentJSON output (object or [object]) into a shaped ExpressDraft. */
function coerceDraft(parsed: unknown): ExpressDraft | null {
  const obj = Array.isArray(parsed) ? parsed[0] : parsed
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const asunto = typeof o.asunto === 'string' ? o.asunto.trim() : ''
  const peticion = typeof o.peticion === 'string' ? o.peticion.trim() : ''
  const cuerpo = Array.isArray(o.cuerpo_parrafos)
    ? o.cuerpo_parrafos.filter(
        (p): p is string => typeof p === 'string' && p.trim().length > 0
      )
    : []
  const categoria =
    typeof o.categoria_normalizada === 'string'
      ? o.categoria_normalizada.trim()
      : 'other'
  if (!asunto || cuerpo.length === 0 || !peticion) return null
  return {
    asunto,
    cuerpo_parrafos: cuerpo,
    peticion,
    categoria_normalizada: categoria,
  }
}

export async function POST(request: NextRequest) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not available' }, { status: 503 })
  }

  const startedAt = Date.now()

  try {
    const json = await request.json().catch(() => null)
    const parsed = draftBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const body = parsed.data

    // Identity: authenticated user (optional) — anonymous is a first-class path.
    let userId: string | null = null
    try {
      const user = await getCurrentUserFromRequest(request)
      userId = user?.id ?? null
    } catch {
      userId = null
    }

    // Rate limit: fixed 3/day per user id / guest id (IP backstop).
    if (senalExpressDraftRateLimit) {
      const id = getSenalExpressIdentifier(request, userId, body.deviceId)
      const rate = await senalExpressDraftRateLimit.limit(id)
      if (!rate.success) {
        return NextResponse.json(
          { error: 'Daily limit reached', code: 'rate_limited' },
          { status: 429 }
        )
      }
    }

    const meta = getAlcaldiaMeta(body.alcaldia)
    if (!meta) {
      return NextResponse.json(
        { error: 'Unsupported alcaldía' },
        { status: 400 }
      )
    }

    const userPrompt = buildOficioUserPrompt({
      sentence: body.sentence,
      alcaldia: body.alcaldia,
      destinatarioTitulo: meta.destinatarioTitulo,
      dependencia: meta.dependencia,
      category: body.category,
      colonia: body.colonia ?? null,
      streetReference: body.streetReference ?? null,
      hasPhoto: body.hasPhoto,
    })

    const client = getAnthropicClient()
    let tokensInput = 0
    let tokensOutput = 0
    let draft: ExpressDraft | null = null
    let lastFailure: 'parse' | 'guardrail' | null = null

    // Up to 2 attempts: the retry appends a stricter reminder (§7.1 guardrail).
    for (let attempt = 0; attempt < 2 && !draft; attempt++) {
      const messages: MessageParam[] = [
        { role: 'user', content: userPrompt },
      ]
      if (attempt > 0) {
        messages.push({ role: 'user', content: OFICIO_RETRY_REMINDER })
      }

      const message = await client.messages.create({
        model: MODELS.CREATIVE,
        max_tokens: DRAFT_MAX_TOKENS,
        temperature: DRAFT_TEMPERATURE,
        system: OFICIO_SYSTEM_PROMPT,
        messages,
      })
      tokensInput += message.usage?.input_tokens ?? 0
      tokensOutput += message.usage?.output_tokens ?? 0

      let candidate: ExpressDraft | null = null
      try {
        candidate = coerceDraft(parseAgentJSON(extractText(message)))
      } catch {
        candidate = null
      }
      if (!candidate) {
        lastFailure = 'parse'
        continue
      }

      const validation = validateOficioDraft(candidate)
      if (!validation.ok) {
        lastFailure = 'guardrail'
        console.warn('[senal-express/draft] guardrail violation', {
          attempt,
          violations: validation.violations,
        })
        continue
      }

      draft = candidate
    }

    if (!draft) {
      await logAgentRun({
        agentName: 'senal-express-draft',
        status: 'error',
        durationMs: Date.now() - startedAt,
        tokensInput,
        tokensOutput,
        errorMessage: `draft failed: ${lastFailure ?? 'unknown'}`,
        summary: { alcaldia: body.alcaldia, category: body.category },
      })
      return NextResponse.json(
        { error: 'Could not produce a compliant oficio', code: 'draft_failed' },
        { status: 422 }
      )
    }

    const admin = createExpressAdminClient()
    const row = await insertExpressOficio(admin, {
      userId,
      deviceId: body.deviceId || null,
      alcaldia: body.alcaldia,
      category: body.category,
      inputSentence: body.sentence,
      draft,
      status: 'draft',
    })

    await logAgentRun({
      agentName: 'senal-express-draft',
      status: 'success',
      durationMs: Date.now() - startedAt,
      tokensInput,
      tokensOutput,
      summary: {
        oficioId: row.id,
        alcaldia: body.alcaldia,
        category: body.category,
        authenticated: Boolean(userId),
      },
    })

    const responseBody: DraftResponseBody = {
      oficioId: row.id,
      draft,
      destinatario: {
        titulo: meta.destinatarioTitulo,
        dependencia: meta.dependencia,
        direccion: meta.direccion,
        email: meta.email,
      },
    }
    return NextResponse.json(responseBody, { status: 201 })
  } catch (err) {
    console.error('[senal-express/draft] fatal', err)
    await logAgentRun({
      agentName: 'senal-express-draft',
      status: 'error',
      durationMs: Date.now() - startedAt,
      errorMessage: err instanceof Error ? err.message : 'unknown',
    }).catch(() => {})
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
