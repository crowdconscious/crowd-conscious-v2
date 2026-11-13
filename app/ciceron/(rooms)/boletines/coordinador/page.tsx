import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AssignButton,
  CompleteButton,
  PartnerSummaryPreview,
} from '../CoordinatorControls'
import { CICERON_BASE, CICERON_DEMO_LABEL } from '@/lib/ciceron/config'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'

export default async function CoordinadorBoletinesPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const data = await loadBulletinBoard(persona)

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'boletines-coordinador', is_demo: true },
  })

  const manualPending = data.board.filter(
    (b) => b.status === 'manual' || b.status === 'fallo'
  )

  return (
    <div>
      <p className="cic-muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
        {CICERON_DEMO_LABEL} · {copy.roleCoordinador}
      </p>
      <h1 className="cic-h1">Coordinación de boletines — 09:30</h1>
      <p className="cic-lead">
        Estado de todas las entidades a la hora objetivo del despacho. Asigne
        revisiones manuales a pasantes y prepare el resumen para socios (vista previa).
      </p>
      <p className="cic-hoy-links">
        <Link href="/ciceron/boletines">{copy.boletines.title}</Link>
      </p>

      <section className="cic-section" aria-labelledby="coord-board">
        <h2 id="coord-board" className="cic-h2">
          Tablero 09:30
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
                <th scope="col">Nivel</th>
                <th scope="col">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {data.board.map((row) => (
                <tr key={row.sourceId}>
                  <td>{row.stateName}</td>
                  <td>{row.statusLabel}</td>
                  <td>{row.tier}</td>
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
                  Estado: {m.status}
                  {m.assignedToName ? ` · Asignado a ${m.assignedToName}` : ''}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer">
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

      <section className="cic-section" aria-labelledby="coord-time">
        <h2 id="coord-time" className="cic-h2">
          {copy.boletines.timeSavedTitle}
        </h2>
        <p>
          <strong style={{ fontFamily: 'var(--cic-serif)', fontSize: '1.6rem' }}>
            {data.timeSaved.hoursReplaced.toFixed(1)}
          </strong>{' '}
          {copy.boletines.hours}
        </p>
        <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
          {copy.boletines.timeSavedDemo}
        </p>
      </section>
    </div>
  )
}
