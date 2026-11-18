/**
 * Firm bulletin clock strip against objetivo / respaldo / límite (CDMX).
 */

import { CICERON_BULLETIN_CLOCK } from '@/lib/ciceron/config'

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

export function bulletinClockStrip(now = new Date()) {
  const nowHm = nowCdmxHm(now)
  return {
    nowHm,
    objetivo: {
      at: CICERON_BULLETIN_CLOCK.objetivo,
      ...remainingToMilestone(CICERON_BULLETIN_CLOCK.objetivo, nowHm),
    },
    respaldo: {
      at: CICERON_BULLETIN_CLOCK.respaldo,
      ...remainingToMilestone(CICERON_BULLETIN_CLOCK.respaldo, nowHm),
    },
    limite: {
      at: CICERON_BULLETIN_CLOCK.limite,
      ...remainingToMilestone(CICERON_BULLETIN_CLOCK.limite, nowHm),
    },
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
