/**
 * Firm bulletin clock strip against objetivo / respaldo / límite (CDMX).
 * In demo mode after hours, anchor to a morning reference so strips stay useful.
 */

import { CICERON_BULLETIN_CLOCK } from '@/lib/ciceron/config'
import { currentCdmxBusinessDay } from '@/lib/ciceron/boletines/demo-freshness'

export type ClockMilestone = 'objetivo' | 'respaldo' | 'limite'

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(':').map(Number)
  return { h: h ?? 0, m: m ?? 0 }
}

/** Minutes from CDMX midnight for HH:MM. */
export function minutesFromMidnight(hm: string): number {
  const { h, m } = parseHm(hm)
  return h * 60 + m
}

/** Current HH:MM in America/Mexico_City (24 h). */
export function nowCdmxHm(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now)
}

export function remainingToMilestone(
  milestoneHm: string,
  nowHm = nowCdmxHm()
): { passed: boolean; label: string } {
  const target = minutesFromMidnight(milestoneHm)
  const now = minutesFromMidnight(nowHm)
  const delta = target - now
  if (delta <= 0) return { passed: true, label: 'Hora vencida' }
  const h = Math.floor(delta / 60)
  const m = delta % 60
  if (h <= 0) return { passed: false, label: `${m} min` }
  return { passed: false, label: `${h} h ${String(m).padStart(2, '0')} min` }
}

/**
 * Demo morning reference: 30 minutes before objetivo on the demo business day.
 * Used when wall-clock is past the firm límite so partners still see a teaching strip.
 */
export const DEMO_CLOCK_MORNING_HM = (() => {
  const obj = minutesFromMidnight(CICERON_BULLETIN_CLOCK.objetivo)
  const morning = Math.max(0, obj - 30)
  const h = Math.floor(morning / 60)
  const m = morning % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})()

export type BulletinClockStripResult = {
  nowHm: string
  /** True when the strip is using the demo morning anchor instead of wall clock. */
  demoAnchored: boolean
  demoBusinessDay: string
  objetivo: { at: string; passed: boolean; label: string }
  respaldo: { at: string; passed: boolean; label: string }
  limite: { at: string; passed: boolean; label: string }
}

export function bulletinClockStrip(
  now = new Date(),
  opts: { demoMode?: boolean } = { demoMode: true }
): BulletinClockStripResult {
  const wallHm = nowCdmxHm(now)
  const limiteMin = minutesFromMidnight(CICERON_BULLETIN_CLOCK.limite)
  const wallMin = minutesFromMidnight(wallHm)
  const demoMode = opts.demoMode !== false
  const pastLimite = wallMin >= limiteMin
  const demoAnchored = demoMode && pastLimite
  const nowHm = demoAnchored ? DEMO_CLOCK_MORNING_HM : wallHm
  const businessDay = currentCdmxBusinessDay(now)

  function slot(at: string) {
    return { at, ...remainingToMilestone(at, nowHm) }
  }

  return {
    nowHm: demoAnchored ? `${nowHm} (demostración)` : nowHm,
    demoAnchored,
    demoBusinessDay: businessDay,
    objetivo: slot(CICERON_BULLETIN_CLOCK.objetivo),
    respaldo: slot(CICERON_BULLETIN_CLOCK.respaldo),
    limite: slot(CICERON_BULLETIN_CLOCK.limite),
  }
}

export function uncoveredEntityCount(
  board: Array<{ status: string }>
): number {
  return board.filter(
    (b) =>
      b.status === 'fallo' ||
      b.status === 'manual' ||
      b.status === 'parcial' ||
      b.status === 'sin_publicacion'
  ).length
}
