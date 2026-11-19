import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AssignButton,
  CompleteButton,
  PartnerSummaryPreview,
} from '../CoordinatorControls'
import { BulletinClockStrip } from '../BulletinClockStrip'
import { CoordinatorBoardView } from '../CoordinatorBoardView'
import { CoordinatorMexicoMap } from '../CoordinatorMexicoMap'
import { PartnerMorningReport } from '../PartnerMorningReport'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { applyHitCountsToBoard } from '@/lib/ciceron/boletines/board-hit-counts-pure'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { formatConsultHm } from '@/lib/ciceron/boletines/map-state-panel-pure'
import type { MapStatePanelDetail } from '@/lib/ciceron/boletines/map-state-panel-pure'
import { buildPartnerReport } from '@/lib/ciceron/boletines/partner-report'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { formatDateLongEs } from '@/lib/ciceron/copy/format-date'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'

export default async function CoordinadorBoletinesPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const data = await loadBulletinBoard(persona)
  const board = applyHitCountsToBoard(data.board, data.hits)

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'boletines-coordinador', is_demo: true },
  })

  const manualPending = board.filter(
    (b) => b.status === 'manual' || b.status === 'fallo'
  )

  const mapDetails: MapStatePanelDetail[] = board.map((row) => {
    const manual = data.manuals.find((m) => m.stateCode === row.stateCode)
    const matters = data.hits
      .filter((h) => h.stateCode === row.stateCode)
      .slice(0, 8)
      .map((h) => ({
        id: h.id,
        label: h.clientName ?? h.expedienteNumber ?? h.courtName ?? h.id,
        matchKind: h.matchKind,
      }))
    return {
      stateCode: row.stateCode,
      stateName: row.stateName,
      statusLabel: row.statusLabel,
      status: row.status,
      sourceName: row.sourceName,
      lastConsultHm: formatConsultHm(row.runFinishedAt),
      reviewerName: manual?.assignedToName ?? null,
      matters,
      hitsExact: row.hitsExact,
      hitsPossible: row.hitsPossible,
    }
  })

  return (
    <div>
      <h1 className="cic-h1">Coordinación de boletines</h1>
      <p className="cic-lead">
        Estado de todas las entidades a la hora objetivo del despacho. Asigne
        revisiones manuales a pasantes y prepare el resumen para socios (vista previa).
      </p>
      <p className="cic-hoy-links">
        <Link href="/ciceron/boletines">{copy.boletines.title}</Link>
      </p>

      <BulletinClockStrip board={board} />

      <CoordinatorMexicoMap
        board={board.map((r) => ({
          stateCode: r.stateCode,
          stateName: r.stateName,
          status: r.status,
          statusLabel: r.statusLabel,
          hitsExact: r.hitsExact,
          hitsPossible: r.hitsPossible,
        }))}
        details={mapDetails}
      />

      <CoordinatorBoardView
        asOfLabel={formatDateLongEs(data.asOf)}
        sourceBadge={
          data.source === 'schema'
            ? copy.boletines.dataSourceDb
            : data.source === 'fixture'
              ? copy.boletines.dataSourceFixture
              : copy.boletines.dataSourceError
        }
        sourceError={data.source === 'error' && data.error ? data.error : null}
        board={board.map((row) => {
          const courts = [
            ...new Set(
              data.hits
                .filter((h) => h.stateCode === row.stateCode && h.courtName)
                .map((h) => h.courtName as string)
            ),
          ]
          return {
            sourceId: row.sourceId,
            stateCode: row.stateCode,
            stateName: row.stateName,
            status: row.status,
            statusLabel: row.statusLabel,
            tierLabel: row.tierLabel,
            sourceUrl: row.sourceUrl,
            publicationDate: row.publicationDate,
            bulletinNumber: row.bulletinNumber,
            mattersSearched: row.mattersSearched,
            hitsExact: row.hitsExact,
            hitsPossible: row.hitsPossible,
            runFinishedAt: row.runFinishedAt,
            failureMessage: row.failureMessage,
            courtNames: courts,
          }
        })}
      />

      <section className="cic-section" aria-labelledby="coord-manual">
        <h2 id="coord-manual" className="cic-h2">
          {copy.boletines.manualTitle}
        </h2>
        {data.manuals.length === 0 && manualPending.length === 0 ? (
          <p className="cic-muted">{copy.boletines.emptyManual}</p>
        ) : (
          <ul className="cic-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.manuals.map((m) => (
              <li key={m.id} className="cic-card" style={{ margin: 0 }}>
                <strong>
                  {m.stateName} — {m.sourceName}
                </strong>
                <p className="cic-muted" style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                  Estado:{' '}
                  {copy.boletines.manualStatus[
                    m.status as keyof typeof copy.boletines.manualStatus
                  ] ?? m.status}
                  {m.assignedToName ? ` · Asignado a ${m.assignedToName}` : ''}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <a
                    className="cic-btn cic-btn-secondary cic-btn-compact"
                    href={m.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {copy.boletines.openSource}
                  </a>
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {m.status === 'pendiente' ? <AssignButton checkId={m.id} /> : null}
                  {m.status !== 'hecho' ? <CompleteButton checkId={m.id} /> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PartnerSummaryPreview />

      <section className="cic-section" aria-labelledby="partner-morning">
        <h2 id="partner-morning" className="cic-h2">
          {copy.boletines.partnerReportTitle}
        </h2>
        <PartnerMorningReport courts={buildPartnerReport(data.hits)} />
      </section>
    </div>
  )
}
