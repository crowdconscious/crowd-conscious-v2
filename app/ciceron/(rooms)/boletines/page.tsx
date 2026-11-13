import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CICERON_BASE, CICERON_DEMO_LABEL } from '@/lib/ciceron/config'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'

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

      <section className="cic-section" aria-labelledby="bol-time">
        <h2 id="bol-time" className="cic-h2">
          {copy.boletines.timeSavedTitle}
        </h2>
        <p>
          <strong style={{ fontFamily: 'var(--cic-serif)', fontSize: '1.6rem' }}>
            {data.timeSaved.hoursReplaced.toFixed(1)}
          </strong>{' '}
          {copy.boletines.hours}
          <span className="cic-muted"> · {data.timeSaved.runsCounted} {copy.boletines.runs}</span>
        </p>
        <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
          {copy.boletines.timeSavedBody} {copy.boletines.timeSavedDemo}
        </p>
      </section>

      <section className="cic-section" aria-labelledby="bol-board">
        <h2 id="bol-board" className="cic-h2">
          {copy.boletines.boardTitle}
        </h2>
        <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
          {data.asOf}
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
                <th scope="col">Entidad</th>
                <th scope="col">Estado</th>
                <th scope="col">Exactas</th>
                <th scope="col">Posibles</th>
                <th scope="col">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {data.board.map((row) => (
                <tr key={row.sourceId}>
                  <td>{row.stateName}</td>
                  <td>
                    <span
                      className={
                        row.status === 'fallo'
                          ? 'cic-deadline is-urgent'
                          : row.status === 'parcial' || row.status === 'manual'
                            ? 'cic-deadline is-soon'
                            : 'cic-deadline is-normal'
                      }
                    >
                      {row.statusLabel}
                    </span>
                    {row.failureMessage ? (
                      <p className="cic-muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                        {row.failureMessage}
                      </p>
                    ) : null}
                  </td>
                  <td>{row.hitsExact}</td>
                  <td>{row.hitsPossible}</td>
                  <td>
                    <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
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
        <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
          {copy.boletines.informative}
        </p>
        {data.hits.length === 0 ? (
          <p className="cic-muted">{copy.boletines.emptyHits}</p>
        ) : (
          <ul className="cic-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.hits.map((h) => (
              <li key={h.id} className="cic-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>
                    {h.stateName} · {h.expedienteNumber ?? '—'}
                  </strong>
                  <span className="cic-muted" style={{ fontSize: '0.85rem' }}>
                    {h.matchKind === 'exact'
                      ? copy.boletines.matchExact
                      : copy.boletines.matchPossible}
                  </span>
                </div>
                <p style={{ margin: '6px 0' }}>{h.reason}</p>
                <p className="cic-muted" style={{ margin: '0 0 6px', fontSize: '0.85rem' }}>
                  {h.courtName} · {h.partyNames}
                </p>
                <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>{h.summary}</p>
                <p className="cic-muted" style={{ fontSize: '0.8rem', margin: '0 0 8px' }}>
                  {h.informativeNotice}
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {h.sourceUrl ? (
                    <a href={h.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {copy.boletines.openSource}
                    </a>
                  ) : null}
                  {h.caseFileId ? (
                    <>
                      {' · '}
                      <Link href={`/ciceron/expedientes/${h.caseFileId}`}>
                        {copy.boletines.openExpediente}
                      </Link>
                    </>
                  ) : null}
                  {' · '}
                  <Link href="/ciceron/revision">{copy.boletines.openRevision}</Link>
                </p>
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
                <strong>{m.stateName}</strong> — {m.status}
                {m.assignedToName ? ` · ${m.assignedToName}` : ''}
                {' · '}
                <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer">
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
