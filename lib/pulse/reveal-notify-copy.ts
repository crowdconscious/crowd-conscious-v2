import { PARTICIPATION_REVEAL_THRESHOLD } from '../display/participation.ts'

export type RevealNotifyLocale = 'es' | 'en'

export type RevealNotifyMarket = {
  id: string
  title: string
  status: string | null
  total_votes: number | null
  resolution_date: string | null
}

/** Ready when the Pulse hits the same reveal threshold the app uses, or closed. */
export function isRevealReady(m: RevealNotifyMarket, now: Date = new Date()): boolean {
  if ((m.total_votes ?? 0) >= PARTICIPATION_REVEAL_THRESHOLD) return true
  if (m.status && m.status !== 'active') return true
  if (m.resolution_date && new Date(m.resolution_date).getTime() <= now.getTime()) return true
  return false
}

function truncate(title: string, max = 72): string {
  const t = title.trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`
}

export function buildPulseRevealReadyPush(params: {
  marketId: string
  marketTitle: string
  locale: RevealNotifyLocale
}) {
  const { marketId, marketTitle, locale } = params
  const route = `/(drawer)/(tabs)/pulses/${marketId}`
  const data = { route, marketId, objectId: marketId, type: 'pulse_reveal_ready' }
  if (locale === 'en') {
    return {
      title: 'Enough votes are in: see how your certainty compares',
      body: `"${truncate(marketTitle)}"`,
      data,
      badge: 1,
    }
  }
  return {
    title: 'Ya hay suficientes votos: mira cómo se compara tu certeza',
    body: `"${truncate(marketTitle)}"`,
    data,
    badge: 1,
  }
}
