import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadFuentesDashboard } from '@/lib/ciceron/dof/health'

function durationLabel(started: string, finished: string | null): string {
  if (!finished) return '—'
  const ms = new Date(finished).getTime() - new Date(started).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export default async function FuentesAdminPage() {
  const { incidents, runs } = await loadFuentesDashboard()

  return (
    <div>
      <h1 className="cic-h1">{copy.adminFuentes.title}</h1>
      <p className="cic-lead">{copy.adminFuentes.lead}</p>

      <section className="cic-section" aria-labelledby="fuentes-incidents">
        <h2 id="fuentes-incidents" className="cic-h2">
          {copy.adminFuentes.incidents}
        </h2>
        {incidents.length === 0 ? (
          <p className="cic-muted">{copy.adminFuentes.noIncidents}</p>
        ) : (
          <ul className="cic-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {incidents.map((i) => (
              <li key={i.id} className="cic-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>
                    {i.incident_date} · {i.kind}
                  </strong>
                  <span className="cic-muted" style={{ fontSize: '0.85rem' }}>
                    {i.severity}
                    {i.resolved_at ? ` · ${copy.adminFuentes.resolved}` : ''}
                  </span>
                </div>
                <p style={{ margin: '8px 0 0' }}>{i.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cic-section" aria-labelledby="fuentes-runs">
        <h2 id="fuentes-runs" className="cic-h2">
          {copy.adminFuentes.runs}
        </h2>
        {runs.length === 0 ? (
          <p className="cic-muted">{copy.adminFuentes.noRuns}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cic-table">
              <thead>
                <tr>
                  <th scope="col">{copy.adminFuentes.colStarted}</th>
                  <th scope="col">{copy.adminFuentes.colDate}</th>
                  <th scope="col">{copy.adminFuentes.colStatus}</th>
                  <th scope="col">{copy.adminFuentes.colDuration}</th>
                  <th scope="col">{copy.adminFuentes.colStats}</th>
                  <th scope="col">{copy.adminFuentes.colError}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.started_at).toISOString()}</td>
                    <td>{r.target_date ?? '—'}</td>
                    <td>{r.status}</td>
                    <td>{durationLabel(r.started_at, r.finished_at)}</td>
                    <td>
                      <code style={{ fontSize: '0.75rem' }}>
                        {JSON.stringify(r.stats ?? {})}
                      </code>
                    </td>
                    <td>{r.error_message ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
