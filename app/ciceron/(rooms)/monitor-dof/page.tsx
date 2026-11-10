import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataTable } from '../../_components/DataTable'
import { DisclosureCard } from '../../_components/DisclosureCard'
import { MatchActions } from '../../_components/MatchActions'
import { ReviewBadge } from '../../_components/ReviewBadge'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadMonitorMatches } from '@/lib/ciceron/demo/monitor-data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { CICERON_SUBJECT_AREAS } from '@/lib/ciceron/taxonomy'
import { CICERON_DOCUMENT_TYPES } from '@/lib/ciceron/taxonomy'

export default async function MonitorDofPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const sp = await searchParams
  const clientId = typeof sp.client === 'string' ? sp.client : null
  const subjectArea = typeof sp.subject === 'string' ? sp.subject : null
  const authority = typeof sp.authority === 'string' ? sp.authority : null
  const documentType = typeof sp.type === 'string' ? sp.type : null

  const { items, source } = await loadMonitorMatches(persona, {
    clientId,
    subjectArea,
    authority,
    documentType,
    onlyMine: true,
  })

  const clients = [...new Map(items.map((i) => [i.clientId, i.clientName])).entries()]

  return (
    <div>
      <h1 className="cic-h1">{copy.monitor.title}</h1>
      <p className="cic-lead">{copy.monitor.lead}</p>
      <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
        {source === 'schema' ? copy.monitor.sourceSchema : copy.monitor.sourceFixture}
      </p>

      <section className="cic-section" aria-label={copy.monitor.filters}>
        <form method="get" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.monitor.filterClient}
            </span>
            <select name="client" className="cic-input" defaultValue={clientId ?? ''} style={{ marginTop: 4 }}>
              <option value="">{copy.monitor.all}</option>
              {clients.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.monitor.filterSubject}
            </span>
            <select name="subject" className="cic-input" defaultValue={subjectArea ?? ''} style={{ marginTop: 4 }}>
              <option value="">{copy.monitor.all}</option>
              {CICERON_SUBJECT_AREAS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.monitor.filterAuthority}
            </span>
            <input
              name="authority"
              className="cic-input"
              defaultValue={authority ?? ''}
              style={{ marginTop: 4 }}
            />
          </label>
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.monitor.filterType}
            </span>
            <select name="type" className="cic-input" defaultValue={documentType ?? ''} style={{ marginTop: 4 }}>
              <option value="">{copy.monitor.all}</option>
              {CICERON_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="cic-btn" style={{ alignSelf: 'end' }}>
            {copy.monitor.filters}
          </button>
          <Link href="/ciceron/monitor-dof" className="cic-muted" style={{ alignSelf: 'end', fontSize: '0.85rem' }}>
            {copy.monitor.all}
          </Link>
        </form>
      </section>

      {items.length === 0 ? (
        <p className="cic-muted">{copy.monitor.emptyFiltered}</p>
      ) : (
        <>
          <section className="cic-section">
            <DataTable
              caption={copy.monitor.onlyMine}
              columns={[
                { key: 'date', header: copy.table.date, cell: (r) => r.date },
                { key: 'authority', header: copy.table.authority, cell: (r) => r.authority },
                { key: 'type', header: copy.table.type, cell: (r) => r.type },
                { key: 'client', header: copy.table.client, cell: (r) => r.clientName },
                {
                  key: 'status',
                  header: copy.table.status,
                  cell: (r) => <ReviewBadge state={r.review} />,
                },
              ]}
              rows={items}
            />
          </section>

          <section className="cic-section" aria-labelledby="monitor-detail">
            <h2 id="monitor-detail" className="cic-h2">
              Detalle
            </h2>
            {items.map((n) => (
              <div key={n.id} style={{ marginBottom: 16 }}>
                <DisclosureCard
                  title={n.title}
                  clientName={n.clientName}
                  reason={n.reason}
                  action={n.action}
                  passage={n.passage}
                  authority={n.authority}
                  type={n.type}
                  date={n.date}
                  officialUrl={n.officialUrl}
                  review={n.review}
                />
                {source === 'schema' ? <MatchActions matchId={n.matchId} /> : null}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
