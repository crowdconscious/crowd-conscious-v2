/**
 * Newsletter polish — small Haiku call that returns an intro paragraph
 * and 3 subject-line candidates for the deterministic newsletter cron.
 *
 * Design: ADDITIVE only. Failure must not block the newsletter send.
 * Caller falls back to the static template subject + no intro on any error.
 *
 * Cost: ~1 Haiku call per cron fire (M/W/F), <500 input + <200 output tokens
 * → ~$0.001 per send. Trivial vs send cost.
 */
import { getAnthropicClient, MODELS, parseAgentJSON } from '@/lib/agents/config'

export interface NewsletterPolishInput {
  postTitle: string | null
  postExcerpt: string | null
  pulseTitle: string | null
  marketTitles: string[]
  daysUntilWorldCup?: number
}

export interface NewsletterPolishOutput {
  intro: string
  subject_candidates: string[]
}

const SYSTEM = `You write the opening line and subject options for the Crowd Conscious newsletter — a free-to-play opinion + Pulse platform in Mexico City.

Voice: smart friend texting, not corporate. Spanish primary. CDMX references when natural. NO emojis in subject lines (Mexican Gmail filters punish them). NO ALL CAPS. NO clickbait.

OUTPUT FORMAT — respond with ONLY a single JSON object, no markdown fences, no preamble:

{
  "intro": "<1-2 ES sentences max, ~30 words, that frame this edition. Hook the reader on what's inside without listing it. NEVER start with 'Esta semana' or 'En esta edición'.>",
  "subject_candidates": [
    "<ES subject under 65 chars, no emoji, no '|' or pipes, evocative not clickbait>",
    "<second variant — different angle from the first>",
    "<third variant — yet another angle>"
  ]
}

HARD RULES
- Subjects: 30-65 chars each. NO trailing brand suffix (the system adds none anymore).
- Intro: do NOT mention the word 'newsletter' or 'edición'.
- If the input has both a featured blog post AND an active Pulse, your subjects should mix both angles across the 3 candidates (don't all push the same item).
- Mexican Spanish, casual but adult.`

export async function generateNewsletterIntroAndSubject(
  input: NewsletterPolishInput
): Promise<NewsletterPolishOutput | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null
  }
  try {
    const anthropic = getAnthropicClient()
    const userMessage = `Featured blog post (title): ${input.postTitle ?? '(none this week)'}
Featured blog excerpt: ${input.postExcerpt?.slice(0, 240) ?? '(none)'}
Active Pulse: ${input.pulseTitle ?? '(none)'}
Trending markets: ${input.marketTitles.slice(0, 3).join(' · ') || '(none)'}
Días hasta Mundial 2026: ${input.daysUntilWorldCup ?? '—'}

Write the intro and 3 subject candidates exactly per system instructions.`

    const response = await anthropic.messages.create({
      model: MODELS.FAST,
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    if (!rawText) return null
    const raw = parseAgentJSON(rawText)
    const candidate = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>
    const intro = String(candidate.intro ?? '').trim()
    const subjects = Array.isArray(candidate.subject_candidates)
      ? (candidate.subject_candidates as unknown[])
          .map((s) => String(s).trim())
          .filter((s) => s.length >= 10 && s.length <= 110)
      : []
    if (!intro && subjects.length === 0) return null
    return {
      intro,
      subject_candidates: subjects.slice(0, 3),
    }
  } catch (e) {
    console.warn('[newsletter-polish] failed:', e)
    return null
  }
}
