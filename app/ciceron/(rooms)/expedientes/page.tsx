import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataTable } from '../../_components/DataTable'
import { DeadlineMarker } from '../../_components/DeadlineMarker'
import { MatterBreadcrumb } from '../../_components/MatterBreadcrumb'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadCaseList, loadM365Status } from '@/lib/ciceron/case-files/data'
import {
  loadSavedViews,
  savedViewHref,
} from '@/lib/ciceron/case-files/saved-views'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; urgency?: string; client?: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const sp = await searchParams
  const [{ cases, schemaReady }, m365, saved] = await Promise.all([
    loadCaseList(persona, {
      q: sp.q,
      urgency: (sp.urgency as 'urgent' | 'soon' | 'normal' | undefined) || undefined,
      clientId: sp.client,
    }),
    loadM365Status(persona),
    loadSavedViews(persona, 'expedientes'),
  ])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 className="cic-h1">{copy.expedientes.title}</h1>
          <p className="cic-lead">{copy.expedientes.lead}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="cic-btn cic-btn-ghost" href="/ciceron/expedientes/calendario">
            {copy.expedientes.calendarLink}
          </Link>
          <Link className="cic-btn cic-btn-ghost" href="/ciceron/expedientes/outlook">
            {m365.status === 'connected' ? copy.m365.connected : copy.m365.connect}
          </Link>
          <Link className="cic-btn" href="/ciceron/expedientes/captura">
            {copy.expedientes.captureManual}
          </Link>
        </div>
      </div>

      {!schemaReady ? (
        <p className="cic-muted" style={{ marginTop: 8, fontSize: '0.9rem' }}>
          {copy.expedientes.schemaMissing}
        </p>
      ) : null}

      <section className="cic-section" aria-label={copy.expedientes.filters}>
        <form method="get" className="cic-card" style={{ display: 'grid', gap: 10 }}>
          <div
            style={{
              display: 'grid',
              gap: 10,
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            }}
          >
            <label>
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {copy.expedientes.filterQuery}
              </span>
              <input
                className="cic-input"
                name="q"
                defaultValue={sp.q ?? ''}
                style={{ marginTop: 4, width: '100%' }}
              />
            </label>
            <label>
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {copy.expedientes.filterUrgency}
              </span>
              <select
                className="cic-input"
                name="urgency"
                defaultValue={sp.urgency ?? ''}
                style={{ marginTop: 4, width: '100%' }}
              >
                <option value="">{copy.monitor.all}</option>
                <option value="urgent">{copy.expedientes.urgencyUrgent}</option>
                <option value="soon">{copy.expedientes.urgencySoon}</option>
                <option value="normal">{copy.expedientes.urgencyNormal}</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" className="cic-btn">
              {copy.expedientes.filters}
            </button>
            {saved.views.length > 0 ? (
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {copy.expedientes.savedViews}:
              </span>
            ) : null}
            {saved.views.map((view) => (
              <Link
                key={view.id}
                href={savedViewHref(view)}
                className="cic-btn cic-btn-ghost"
                style={{ fontSize: '0.85rem' }}
              >
                {view.name}
              </Link>
            ))}
            {saved.views.length === 0 ? (
              <Link
                href="/ciceron/expedientes?urgency=soon"
                className="cic-btn cic-btn-ghost"
                style={{ fontSize: '0.85rem' }}
              >
                {copy.expedientes.viewUrgent}
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="cic-section">
        <DataTable
          columns={[
            {
              key: 'client',
              header: copy.table.client,
              cell: (r) => (
                <Link href={`/ciceron/expedientes/${r.id}`}>
                  <MatterBreadcrumb client={r.clientName} matter={r.matterTitle} />
                </Link>
              ),
            },
            { key: 'court', header: copy.table.court, cell: (r) => r.court },
            {
              key: 'file',
              header: copy.table.file,
              cell: (r) => (
                <Link href={`/ciceron/expedientes/${r.id}`}>{r.fileNumber}</Link>
              ),
            },
            {
              key: 'event',
              header: copy.expedientes.lastEvent,
              cell: (r) => r.lastEvent,
            },
            {
              key: 'deadline',
              header: copy.expedientes.nextDeadline,
              cell: (r) => (
                <DeadlineMarker label={r.nextDeadline} urgency={r.urgency} />
              ),
            },
          ]}
          rows={cases}
        />
      </section>
    </div>
  )
}
