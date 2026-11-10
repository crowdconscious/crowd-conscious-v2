import { redirect } from 'next/navigation'
import { DataTable } from '../../_components/DataTable'
import { DisclosureCard } from '../../_components/DisclosureCard'
import { ReviewBadge } from '../../_components/ReviewBadge'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadDofNotes } from '@/lib/ciceron/demo/data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export default async function MonitorDofPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const { notes } = await loadDofNotes(persona)

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
          rows={notes}
        />
      </section>

      <section className="cic-section" aria-labelledby="monitor-detail">
        <h2 id="monitor-detail" className="cic-h2">
          Detalle
        </h2>
        {notes.map((n) => (
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
