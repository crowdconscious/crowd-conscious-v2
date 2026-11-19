/**
 * Simulated Monday partner digest — preview only, never sent.
 * Reads like a brief partner memo, not a repetitive movement list.
 */

import { formatDateLongEs, formatDateRangeEs } from '@/lib/ciceron/copy/format-date'
import { weekdayNameEsFromIso } from '@/lib/ciceron/demo/hoy-daily-line-pure'

export type DigestMovement = {
  id: string
  clientName: string
  /** Plain-Spanish acuerdo excerpt. */
  acuerdo: string
  expedienteNumber: string | null
  courtName: string | null
}

export type DigestDeadline = {
  id: string
  clientName: string
  label: string
  dueAt: string
}

export type DigestReview = {
  id: string
  title: string
  clientName: string
  dueLabel: string
}

export type WeeklyDigestPreview = {
  subject: string
  greeting: string
  weekLabel: string
  /** One-line partner headline. */
  headline: string
  movements: Array<{ id: string; text: string }>
  deadlines: Array<{ id: string; text: string }>
  reviews: Array<{ id: string; text: string }>
  closing: string
  simulated: true
}

function cleanAcuerdo(raw: string): string {
  return raw
    .trim()
    .replace(/^Datos de demostración\.\s*/i, '')
    .replace(/\s*Datos de demostración\.?\s*$/i, '')
    .trim()
}

export function buildWeeklyDigestPreview(input: {
  partnerName: string
  weekStartIso: string
  weekEndIso: string
  movements: DigestMovement[]
  deadlines: DigestDeadline[]
  reviews: DigestReview[]
}): WeeklyDigestPreview {
  const range = formatDateRangeEs(input.weekStartIso, input.weekEndIso)
  const movedCount = input.movements.length
  const plazoCount = input.deadlines.length
  const reviewCount = input.reviews.length

  const headlineParts: string[] = []
  if (movedCount > 0) {
    headlineParts.push(
      movedCount === 1
        ? '1 cliente con movimiento publicado'
        : `${movedCount} clientes con movimiento publicado`
    )
  }
  if (plazoCount > 0) {
    headlineParts.push(
      plazoCount === 1 ? '1 plazo esta semana' : `${plazoCount} plazos esta semana`
    )
  }
  if (reviewCount > 0) {
    headlineParts.push(
      reviewCount === 1 ? '1 revisión pendiente' : `${reviewCount} revisiones pendientes`
    )
  }
  const headline =
    headlineParts.length > 0
      ? `Semana ${range}: ${headlineParts.join('; ')}.`
      : `Semana ${range}: sin movimientos que requieran su atención inmediata.`

  const movements = input.movements.slice(0, 8).map((m) => {
    const acuerdo = cleanAcuerdo(m.acuerdo) || 'acuerdo publicado en lista'
    const exp = m.expedienteNumber?.trim()
    const court = m.courtName?.trim()
    const bits = [
      exp ? `expediente ${exp}` : null,
      court ? court : null,
    ].filter(Boolean)
    const where = bits.length > 0 ? ` (${bits.join(' · ')})` : ''
    return {
      id: m.id,
      text: `${m.clientName}${where}: ${acuerdo}.`,
    }
  })

  const deadlines = input.deadlines.slice(0, 8).map((d) => {
    const day = weekdayNameEsFromIso(d.dueAt)
    const dateLabel = formatDateLongEs(d.dueAt)
    return {
      id: d.id,
      text: `${day} ${dateLabel} — ${d.clientName}: ${d.label}.`,
    }
  })

  const reviews = input.reviews.slice(0, 6).map((r) => ({
    id: r.id,
    text: `${r.clientName}: ${r.title} (vence ${r.dueLabel}).`,
  }))

  return {
    subject: `Resumen semanal del despacho — ${range}`,
    greeting: `Estimada ${input.partnerName}:`,
    weekLabel: `Semana del ${range} (Ciudad de México)`,
    headline,
    movements,
    deadlines,
    reviews,
    closing:
      'Este correo es una vista previa de demostración. No se envía a nadie. Datos de demostración.',
    simulated: true,
  }
}
