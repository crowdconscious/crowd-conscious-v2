export const PULSE_EMBED_POSITIONS = ['after_intro', 'before_cta', 'full_section'] as const
export type PulseEmbedPosition = (typeof PULSE_EMBED_POSITIONS)[number]

export function parsePulseEmbedPosition(raw: string | null | undefined): PulseEmbedPosition {
  const s = raw ?? 'before_cta'
  return (PULSE_EMBED_POSITIONS as readonly string[]).includes(s) ? (s as PulseEmbedPosition) : 'before_cta'
}

/** Keys stored in blog_posts.pulse_embed_components */
export const PULSE_EMBED_COMPONENT_KEYS = [
  'results_bars',
  'executive_summary',
  'key_insights',
  'confidence_chart',
  'vote_timeline',
  'vote_metrics',
] as const

export type PulseEmbedComponentKey = (typeof PULSE_EMBED_COMPONENT_KEYS)[number]

export const DEFAULT_PULSE_EMBED_COMPONENTS: PulseEmbedComponentKey[] = [
  ...PULSE_EMBED_COMPONENT_KEYS,
]

export function normalizePulseEmbedComponents(raw: unknown): PulseEmbedComponentKey[] {
  if (!raw) return [...DEFAULT_PULSE_EMBED_COMPONENTS]
  const arr = Array.isArray(raw) ? raw : []
  const set = new Set<string>()
  for (const x of arr) {
    const s = String(x).trim()
    const key = s === 'vote_count' ? 'vote_metrics' : s
    if ((PULSE_EMBED_COMPONENT_KEYS as readonly string[]).includes(key)) set.add(key)
  }
  return set.size > 0 ? (Array.from(set) as PulseEmbedComponentKey[]) : [...DEFAULT_PULSE_EMBED_COMPONENTS]
}
