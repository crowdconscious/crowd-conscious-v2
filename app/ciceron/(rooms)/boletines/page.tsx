import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BulletinClockStrip } from './BulletinClockStrip'
import { BulletinMatchCard } from '../../_components/BulletinMatchCard'
import { EmptyState } from '../../_components/EmptyState'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
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

export default async function BoletinesPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const data = await loadBulletinBoard(persona)

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'boletines', is_demo: true },
  })

  return (
    <div>
      <h1 className="cic-h1">{copy.boletines.title}</h1>
      <p className="cic-lead">{copy.boletines.lead}</p>
      <p className="cic-hoy-links">
        <Link href="/ciceron/boletines/coordinador">{copy.boletines.coordinatorLink}</Link>
        {' · '}
        <Link href="/ciceron/revision">{copy.boletines.openRevision}</Link>
      </p>

      <BulletinClockStrip board={data.board} />

      <section className="cic-section" aria-labelledby="bol-board">
        <h2 id="bol-board" className="cic-h2">
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
              {data.board.map((row) => (
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
                        {row.failureMessage ? ` — ${row.failureMessage}` : ''}
                      </p>
                    ) : row.failureMessage ? (
                      <p className="cic-muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                        {row.failureMessage}
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

      <section className="cic-section" aria-labelledby="bol-hits">
        <h2 id="bol-hits" className="cic-h2">
          {copy.boletines.hitsTitle}
        </h2>
        <p className="cic-bol-notice" role="note">
          {copy.boletines.informative}
        </p>
        {data.hits.length === 0 ? (
          <EmptyState title={copy.boletines.emptyHits} href="/ciceron/hoy" cta={copy.empty.openHoy}>
            {copy.empty.generic}
          </EmptyState>
        ) : (
          <ul className="cic-stack cic-match-list">
            {data.hits.map((h) => (
              <li key={h.id}>
                <BulletinMatchCard
                  id={h.id}
                  clientName={h.clientName}
                  clientSide={h.clientSide}
                  courtName={h.courtName}
                  summary={h.summary}
                  publicationDateLabel={
                    h.publicationDate ? formatDateLongEs(h.publicationDate) : null
                  }
                  expedienteNumber={h.expedienteNumber}
                  deadlineLabel={null}
                  matchKind={h.matchKind}
                  caseFileId={h.caseFileId}
                  sourceUrl={h.sourceUrl}
                  reason={h.reason}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cic-section" aria-labelledby="bol-man">
        <h2 id="bol-man" className="cic-h2">
          {copy.boletines.manualTitle}
        </h2>
        {data.manuals.length === 0 ? (
          <p className="cic-muted">{copy.boletines.emptyManual}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.manuals.map((m) => (
              <li key={m.id}>
                <strong>{m.stateName}</strong> —{' '}
                {copy.boletines.manualStatus[
                  m.status as keyof typeof copy.boletines.manualStatus
                ] ?? m.status}
                {m.assignedToName ? ` · ${m.assignedToName}` : ''}
                {' · '}
                <a
                  className="cic-btn cic-btn-secondary cic-btn-compact"
                  href={m.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.boletines.openSource}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
