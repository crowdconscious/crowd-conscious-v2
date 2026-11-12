import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { loadSalesInviteProgress } from '@/lib/ciceron/demo/sales'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { ResetDemoButton } from './ResetDemoButton'
import { recordCiceronEvent } from '@/lib/ciceron/events'

export default async function AdminVentasPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)
  if (persona.role !== 'admin') {
    redirect(`${CICERON_BASE}/hoy`)
  }

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'admin-ventas', is_demo: true },
  })

  const { rows, source } = await loadSalesInviteProgress(persona)

  return (
    <div>
      <h1 className="cic-h1">{copy.adminVentas.title}</h1>
      <p className="cic-lead">{copy.adminVentas.lead}</p>
      <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
        {source === 'schema' ? copy.adminMetricas.schemaSource : copy.adminMetricas.demoSource}
      </p>

      {rows.length === 0 ? (
        <p className="cic-muted">{copy.adminVentas.empty}</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table className="cic-table">
            <thead>
              <tr>
                <th scope="col">{copy.adminVentas.prospect}</th>
                <th scope="col">{copy.adminVentas.uses}</th>
                <th scope="col">{copy.adminVentas.sessions}</th>
                <th scope="col">{copy.adminVentas.rooms}</th>
                <th scope="col">{copy.adminVentas.storySteps}</th>
                <th scope="col">{copy.adminVentas.finished}</th>
                <th scope="col">{copy.adminVentas.lastSeen}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.inviteCodeId}>
                  <td>{r.prospectLabel}</td>
                  <td>
                    {r.useCount}
                    {r.maxUses != null ? ` / ${r.maxUses}` : ''}
                  </td>
                  <td>{r.sessionsOpened}</td>
                  <td>{r.roomsOpenedApprox}</td>
                  <td>{r.maxStoryStepsCompleted}</td>
                  <td>{r.storiesFinished}</td>
                  <td className="cic-muted" style={{ fontSize: '0.85rem' }}>
                    {r.lastSeenAt
                      ? new Date(r.lastSeenAt).toLocaleString('es-MX')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {persona.role === 'admin' || persona.role === 'socio' ? (
        <section className="cic-section" aria-labelledby="reset-demo" style={{ marginTop: 32 }}>
          <h2 id="reset-demo" className="cic-h2">
            {copy.adminVentas.resetTitle}
          </h2>
          <p>{copy.adminVentas.resetBody}</p>
          <ResetDemoButton />
        </section>
      ) : null}
    </div>
  )
}
