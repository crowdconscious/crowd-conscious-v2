import { DataTable } from '../../_components/DataTable'
import { DisclosureCard } from '../../_components/DisclosureCard'
import { ReviewBadge } from '../../_components/ReviewBadge'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { fixtureDofNotes } from '@/lib/ciceron/demo/fixtures'

export default function MonitorDofPage() {
  return (
    <div>
      <h1 className="cic-h1">{copy.monitor.title}</h1>
      <p className="cic-lead">{copy.monitor.lead}</p>

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
          rows={fixtureDofNotes.map((n) => ({ ...n }))}
        />
      </section>

      <section className="cic-section" aria-labelledby="monitor-detail">
        <h2 id="monitor-detail" className="cic-h2">
          Detalle
        </h2>
        {fixtureDofNotes.map((n) => (
          <DisclosureCard
            key={n.id}
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
        ))}
      </section>
    </div>
  )
}
