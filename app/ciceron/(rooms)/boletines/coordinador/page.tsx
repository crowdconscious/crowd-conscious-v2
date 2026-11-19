import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AssignButton,
  CompleteButton,
  PartnerSummaryPreview,
} from '../CoordinatorControls'
import { BulletinClockStrip } from '../BulletinClockStrip'
import { CoordinatorMexicoMap } from '../CoordinatorMexicoMap'
import { PartnerMorningReport } from '../PartnerMorningReport'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { applyHitCountsToBoard } from '@/lib/ciceron/boletines/board-hit-counts-pure'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { formatConsultHm } from '@/lib/ciceron/boletines/map-state-panel-pure'
import type { MapStatePanelDetail } from '@/lib/ciceron/boletines/map-state-panel-pure'
import { buildPartnerReport } from '@/lib/ciceron/boletines/partner-report'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  formatDateLongEs,
  formatDateTimeEs,
} from '@/lib/ciceron/copy/format-date'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'

function statusClass(status: string): string {
  if (status === 'fallo') return 'cic-bol-status is-critical'
  if (status === 'manual' || status === 'parcial') return 'cic-bol-status is-warning'
  if (status === 'sin_publicacion') return 'cic-bol-status is-neutral'
  return 'cic-bol-status is-good'
}

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

      <section className="cic-section" aria-labelledby="coord-board">
        <h2 id="coord-board" className="cic-h2">
          {copy.boletines.boardTitle}
        </h2>
        <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
          {formatDateLongEs(data.asOf)}
          {' · '}
          <span
            role="status"
            style={{
              fontWeight: 600,
              color:
                data.source === 'error'
                  ? 'var(--cic-danger, #b42318)'
                  : data.source === 'fixture'
                    ? 'var(--cic-warn, #8a5a00)'
                    : 'inherit',
            }}
          >
            {data.source === 'schema'
              ? copy.boletines.dataSourceDb
              : data.source === 'fixture'
                ? copy.boletines.dataSourceFixture
                : copy.boletines.dataSourceError}
          </span>
        </p>
        {data.source === 'error' && data.error ? (
          <p className="cic-policy-box is-denied" role="alert">
            {data.error}
          </p>
        ) : null}
        <div className="cic-table-wrap">
          <table className="cic-table">
            <thead>
              <tr>
                <th scope="col">{copy.boletines.colEntidad}</th>
                <th scope="col">{copy.boletines.colPublicacion}</th>
                <th scope="col">{copy.boletines.colNivel}</th>
                <th scope="col">{copy.boletines.colBuscados}</th>
                <th scope="col">{copy.boletines.colExactas}</th>
                <th scope="col">{copy.boletines.colPosibles}</th>
                <th scope="col">{copy.boletines.colHoraCorrida}</th>
                <th scope="col">{copy.boletines.colEstado}</th>
                <th scope="col">{copy.boletines.colAccion}</th>
              </tr>
            </thead>
            <tbody>
              {board.map((row) => (
                <tr key={row.sourceId}>
                  <td>{row.stateName}</td>
                  <td>
                    {row.publicationDate
                      ? formatDateLongEs(row.publicationDate)
                      : '—'}
                    {row.bulletinNumber ? (
                      <span
                        className="cic-muted"
                        style={{
                          display: 'inline-flex',
                          gap: 6,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          fontSize: '0.8rem',
                        }}
                      >
                        {row.bulletinNumber}
                        <span className="cic-demo-inline" style={{ fontSize: '0.7rem' }}>
                          {copy.demoLabel}
                        </span>
                      </span>
                    ) : null}
                  </td>
                  <td>{row.tierLabel}</td>
                  <td>{row.mattersSearched}</td>
                  <td>{row.hitsExact}</td>
                  <td>{row.hitsPossible}</td>
                  <td>
                    {row.runFinishedAt ? formatDateTimeEs(row.runFinishedAt) : '—'}
                  </td>
                  <td>
                    <span className={statusClass(row.status)}>{row.statusLabel}</span>
                    {row.status === 'fallo' ? (
                      <p className="cic-muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                        {copy.boletines.revisarManualmente}
                      </p>
                    ) : null}
                  </td>
                  <td>
                    <a
                      className="cic-btn cic-btn-secondary cic-btn-compact"
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {copy.boletines.openSource}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
