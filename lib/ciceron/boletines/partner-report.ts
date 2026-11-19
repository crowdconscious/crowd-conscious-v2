/**
 * Morning partners' report: heading per court, then a firm-layout table.
 */

import type { BulletinHitView } from '@/lib/ciceron/boletines/demo-data'
import { formatDateLongEs } from '@/lib/ciceron/copy/format-date'

export type PartnerReportRow = {
  actor: string
  demandado: string
  expediente: string
  juicio: string
  secretaria: string
  publicado: string
  actualizacion: string
  firmClient: string | null
  firmClientSide: 'actor' | 'demandado' | null
}

export type PartnerReportCourt = {
  courtName: string
  rows: PartnerReportRow[]
}

function splitParties(partyNames: string | null): { actor: string; demandado: string } {
  if (!partyNames) return { actor: '—', demandado: '—' }
  const parts = partyNames.split(/\s*\/\s*/)
  return {
    actor: parts[0]?.trim() || '—',
    demandado: parts[1]?.trim() || '—',
  }
}

export function buildPartnerReport(hits: BulletinHitView[]): PartnerReportCourt[] {
  const byCourt = new Map<string, PartnerReportRow[]>()
  for (const h of hits) {
    const court = h.courtName?.trim() || 'Sin juzgado'
    const parties = splitParties(h.partyNames)
    const row: PartnerReportRow = {
      actor: parties.actor,
      demandado: parties.demandado,
      expediente: h.expedienteNumber ?? '—',
      juicio: '—',
      secretaria: h.secretaria?.trim() ? h.secretaria : '—',
      publicado: h.publicationDate ? formatDateLongEs(h.publicationDate) : '—',
      actualizacion: h.summary?.slice(0, 160) ?? '—',
      firmClient: h.clientName,
      firmClientSide: h.clientSide,
    }
    const list = byCourt.get(court) ?? []
    list.push(row)
    byCourt.set(court, list)
  }
  return [...byCourt.entries()]
    .map(([courtName, rows]) => ({ courtName, rows }))
    .sort((a, b) => a.courtName.localeCompare(b.courtName, 'es-MX'))
}

export function partnerReportPlainText(
  courts: PartnerReportCourt[],
  firmName: string
): string {
  const lines = [
    `Resumen matutino — ${firmName}`,
    'Datos de demostración. Informativo: no constituye notificación judicial.',
    '',
  ]
  for (const c of courts) {
    lines.push(c.courtName)
    lines.push(
      'Actor | Demandado | Exp. | Juicio | Sría. | Publicado | Actualización'
    )
    for (const r of c.rows) {
      const mark =
        r.firmClientSide === 'actor'
          ? ' [cliente · actor]'
          : r.firmClientSide === 'demandado'
            ? ' [cliente · demandado]'
            : ''
      lines.push(
        `${r.actor}${r.firmClientSide === 'actor' ? mark : ''} | ${r.demandado}${r.firmClientSide === 'demandado' ? mark : ''} | ${r.expediente} | ${r.juicio} | ${r.secretaria} | ${r.publicado} | ${r.actualizacion}`
      )
    }
    lines.push('')
  }
  return lines.join('\n')
}
