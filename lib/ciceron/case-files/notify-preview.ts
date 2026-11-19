/**
 * Pure helpers for the client-notification draft preview.
 * Models often wrap JSON in fences or prose; the UI must never show raw objects.
 */

export type NotifyPreviewFields = {
  subject: string
  body: string
}

/** True when the string still looks like a brace-delimited JSON object. */
export function containsBraceDelimitedObject(text: string): boolean {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start
}

/**
 * Extract a JSON object from plain, fenced, or prose-wrapped model output.
 * Throws when no object can be parsed.
 */
export function parseModelJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fence ? fence[1]!.trim() : trimmed
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('no JSON object in model output')
  }
  return JSON.parse(raw.slice(start, end + 1))
}

/**
 * Build a lawyer-safe notify preview from model text.
 * Prefer parsed subject/body; if the reply still looks like an object and cannot
 * be parsed into usable strings, fall back so the UI never renders raw JSON.
 */
export function formatClientNotifyPreview(
  raw: string,
  fallback: NotifyPreviewFields
): NotifyPreviewFields {
  try {
    const parsed = parseModelJsonObject(raw) as {
      subject?: unknown
      body?: unknown
    }
    const subject =
      typeof parsed.subject === 'string' && parsed.subject.trim()
        ? parsed.subject.trim()
        : fallback.subject
    const body =
      typeof parsed.body === 'string' && parsed.body.trim()
        ? parsed.body.trim()
        : fallback.body
    if (containsBraceDelimitedObject(subject) || containsBraceDelimitedObject(body)) {
      return { ...fallback }
    }
    return { subject, body }
  } catch {
    if (containsBraceDelimitedObject(raw)) {
      return { ...fallback }
    }
    const plain = raw.trim()
    return {
      subject: fallback.subject,
      body: plain || fallback.body,
    }
  }
}
