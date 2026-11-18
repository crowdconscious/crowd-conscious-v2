import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BulletinClockStrip } from './BulletinClockStrip'
import { CICERON_BASE, CICERON_DEMO_LABEL } from '@/lib/ciceron/config'
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
      <p className="cic-muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
        {CICERON_DEMO_LABEL}
      </p>
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
                      <span className="cic-muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                        Núm. {row.bulletinNumber}
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
          <p className="cic-muted">{copy.boletines.emptyHits}</p>
        ) : (
          <ul className="cic-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.hits.map((h) => (
              <li key={h.id} className="cic-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    {h.clientName ? (
                      <p style={{ margin: '0 0 4px' }}>
                        <strong>{h.clientName}</strong>
                        {h.clientSide ? (
                          <span className="cic-muted">
                            {' '}
                            (
                            {h.clientSide === 'actor'
                              ? copy.boletines.clientSideActor
                              : copy.boletines.clientSideDemandado}
                            )
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    <strong>
                      {h.stateName} · {h.expedienteNumber ?? '—'}
                    </strong>
                  </div>
                  <span className="cic-muted" style={{ fontSize: '0.85rem' }}>
                    {h.matchKind === 'exact'
                      ? copy.boletines.matchExact
                      : copy.boletines.matchPossible}
                  </span>
                </div>
                <p style={{ margin: '6px 0' }}>{h.reason}</p>
                <p className="cic-muted" style={{ margin: '0 0 6px', fontSize: '0.85rem' }}>
                  {copy.boletines.publicationDate}:{' '}
                  {h.publicationDate ? formatDateLongEs(h.publicationDate) : '—'}
                  {' · '}
                  {h.courtName ?? '—'}
                  {' · '}
                  {copy.boletines.secretaria}: {h.secretaria?.trim() ? h.secretaria : '—'}
                </p>
                <p className="cic-legal" style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>
                  {h.summary}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {h.caseFileId ? (
                    <Link
                      className="cic-btn cic-btn-compact"
                      href={`/ciceron/expedientes/${h.caseFileId}`}
                    >
                      {copy.boletines.openExpedienteBtn}
                    </Link>
                  ) : null}
                  <Link
                    className="cic-btn cic-btn-secondary cic-btn-compact"
                    href="/ciceron/expedientes/captura"
                  >
                    {copy.boletines.captureAcuerdoBtn}
                  </Link>
                  <Link
                    className="cic-btn cic-btn-secondary cic-btn-compact"
                    href="/ciceron/revision"
                  >
                    {copy.boletines.sendReviewBtn}
                  </Link>
                  {h.sourceUrl ? (
                    <a
                      className="cic-btn cic-btn-secondary cic-btn-compact"
                      href={h.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {copy.boletines.openSource}
                    </a>
                  ) : null}
                </div>
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
