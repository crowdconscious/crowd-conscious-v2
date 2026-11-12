import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { DeadlineMarker } from '../../../_components/DeadlineMarker'
import { MatterBreadcrumb } from '../../../_components/MatterBreadcrumb'
import { MatterTopbarTitle } from '../../../_components/MatterChrome'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadCaseDetail } from '@/lib/ciceron/case-files/data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { canConfirmDeadline } from '@/lib/ciceron/case-files/confirm-deadline'
import { ClientActions, DeadlineConfirm } from './CaseActions'

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const { id } = await params
  const { detail, schemaReady } = await loadCaseDetail(persona, id)
  if (!detail) notFound()

  const canConfirm = canConfirmDeadline(persona.role)

  return (
    <div>
      <MatterTopbarTitle title={detail.matterTitle} />
      <p style={{ marginBottom: 8 }}>
        <Link href="/ciceron/expedientes" className="cic-muted" style={{ fontSize: '0.9rem' }}>
          ← {copy.rooms.expedientes}
        </Link>
      </p>
      <p className="cic-demo-inline">{copy.demoLabel}</p>
      <h1 className="cic-h1" style={{ fontSize: '1.6rem' }}>
        {detail.fileNumber}
      </h1>
      <MatterBreadcrumb client={detail.clientName} matter={detail.matterTitle} />
      <p className="cic-muted" style={{ marginTop: 8 }}>
        {detail.court}
      </p>
      {!schemaReady ? (
        <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
          {copy.expedientes.schemaMissing}
        </p>
      ) : null}

      <div
        style={{
          display: 'grid',
          gap: 20,
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, 0.8fr)',
          marginTop: 24,
        }}
        className="cic-case-grid"
      >
        <section className="cic-section" aria-labelledby="timeline">
          <h2 id="timeline" className="cic-h2">
            {copy.expedientes.timeline}
          </h2>
          <ol className="cic-timeline">
            {detail.events.map((ev) => (
              <li key={ev.id} className="cic-timeline-item">
                <div className="cic-timeline-meta">
                  <time dateTime={ev.occurredAt}>{ev.occurredLabel}</time>
                  <span className="cic-muted">{ev.eventType}</span>
                </div>
                <p className="cic-legal" style={{ margin: '6px 0' }}>
                  {ev.aiSummary}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" className="cic-source" title={ev.originalLabel}>
                    {copy.expedientes.sourceOriginal} · {ev.originalLabel}
                  </button>
                  <span className="cic-muted" style={{ fontSize: '0.8rem' }}>
                    {ev.summary}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <aside>
          <section className="cic-card cic-section" aria-labelledby="deadlines">
            <h2 id="deadlines" className="cic-h2" style={{ fontSize: '1rem' }}>
              {copy.expedientes.deadlinesPanel}
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {detail.deadlines.map((d) => (
                <li
                  key={d.id}
                  style={{
                    borderTop: '1px solid var(--cic-rule)',
                    padding: '12px 0',
                  }}
                >
                  <DeadlineMarker label={d.dueLabel} urgency={d.urgency} />
                  <div style={{ marginTop: 6, fontSize: '0.85rem' }}>
                    <span className={`cic-review cic-review-${d.status === 'confirmado' ? 'aprobado' : d.status === 'descartado' ? 'rechazado' : 'borrador'}`}>
                      {copy.expedientes[d.status === 'propuesto' ? 'proposed' : d.status === 'confirmado' ? 'confirmed' : 'discarded']}
                    </span>
                  </div>
                  <p className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
                    <strong>{copy.expedientes.basis}:</strong> {d.basisText}
                  </p>
                  <p className="cic-muted" style={{ fontSize: '0.8rem' }}>
                    <strong>{copy.expedientes.computation}:</strong> {d.computationText}
                  </p>
                  {d.confirmedBy ? (
                    <p className="cic-muted" style={{ fontSize: '0.75rem' }}>
                      Confirmado {d.confirmedAt ?? ''}
                    </p>
                  ) : null}
                  {d.status === 'propuesto' && canConfirm ? (
                    <DeadlineConfirm caseId={detail.id} deadlineId={d.id} />
                  ) : null}
                  {d.status === 'propuesto' && !canConfirm ? (
                    <p className="cic-muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
                      Solo un socio o asociado puede confirmar este plazo.
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <ClientActions
            caseId={detail.id}
            matterId={detail.matterId}
            clientName={detail.clientName}
            fileNumber={detail.fileNumber}
            eventText={detail.events[detail.events.length - 1]?.text ?? detail.events[0]?.text ?? ''}
          />
        </aside>
      </div>
    </div>
  )
}
