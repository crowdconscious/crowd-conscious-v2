/** Normalized outcome shape accepted by Pulse creation APIs. */
export type PulseOutcomeInput = {
  title: string
  subtitle: string | null
  labelEn: string | null
  subtitleEn: string | null
}

export type RawOutcomePayload =
  | string
  | {
      title?: string
      label?: string
      name?: string
      subtitle?: string | null
      label_en?: string
      labelEn?: string
      subtitle_en?: string
      subtitleEn?: string
      translations?: {
        en?: { label?: string; subtitle?: string }
      }
    }

export function normalizePulseOutcomes(raw: unknown): PulseOutcomeInput[] {
  if (!Array.isArray(raw)) return []
  const out: PulseOutcomeInput[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const title = item.trim()
      if (title) out.push({ title, subtitle: null, labelEn: null, subtitleEn: null })
      continue
    }
    if (!item || typeof item !== 'object') continue
    const o = item as RawOutcomePayload & Record<string, unknown>
    const titleRaw =
      (typeof o.title === 'string' ? o.title : '') ||
      (typeof o.label === 'string' ? o.label : '') ||
      (typeof o.name === 'string' ? o.name : '')
    const title = titleRaw.trim()
    if (!title) continue
    const subtitleRaw = typeof o.subtitle === 'string' ? o.subtitle.trim() : ''
    const subtitle = subtitleRaw || null
    const labelEnRaw =
      (typeof o.labelEn === 'string' ? o.labelEn : '') ||
      (typeof o.label_en === 'string' ? o.label_en : '') ||
      (typeof o.translations === 'object' &&
      o.translations &&
      typeof (o.translations as { en?: { label?: string } }).en?.label === 'string'
        ? (o.translations as { en: { label: string } }).en.label
        : '')
    const labelEn = labelEnRaw.trim() || null
    const subtitleEnRaw =
      (typeof o.subtitleEn === 'string' ? o.subtitleEn : '') ||
      (typeof o.subtitle_en === 'string' ? o.subtitle_en : '') ||
      (typeof o.translations === 'object' &&
      o.translations &&
      typeof (o.translations as { en?: { subtitle?: string } }).en?.subtitle === 'string'
        ? (o.translations as { en: { subtitle: string } }).en.subtitle
        : '')
    const subtitleEn = subtitleEnRaw.trim() || null
    if (subtitle && subtitle.length > 200) continue
    if (subtitleEn && subtitleEn.length > 200) continue
    out.push({ title, subtitle, labelEn, subtitleEn })
  }
  return out
}

export function outcomeTranslationsPayload(
  labelEn: string | null,
  subtitleEn: string | null
): { en: { label?: string; subtitle?: string } } | null {
  const en: { label?: string; subtitle?: string } = {}
  if (labelEn) en.label = labelEn
  if (subtitleEn) en.subtitle = subtitleEn
  return Object.keys(en).length > 0 ? { en } : null
}
