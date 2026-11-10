import { DataTable } from '../../_components/DataTable'
import { DeadlineMarker } from '../../_components/DeadlineMarker'
import { MatterBreadcrumb } from '../../_components/MatterBreadcrumb'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { fixtureCases } from '@/lib/ciceron/demo/fixtures'

export default function ExpedientesPage() {
  return (
    <div>
      <h1 className="cic-h1">{copy.expedientes.title}</h1>
      <p className="cic-lead">{copy.expedientes.lead}</p>

      <section className="cic-section">
        <DataTable
          columns={[
            {
              key: 'client',
              header: copy.table.client,
              cell: (r) => (
                <MatterBreadcrumb client={r.clientName} matter={r.matterTitle} />
              ),
            },
            { key: 'court', header: copy.table.court, cell: (r) => r.court },
            { key: 'file', header: copy.table.file, cell: (r) => r.fileNumber },
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
          rows={fixtureCases.map((c) => ({ ...c }))}
        />
      </section>
    </div>
  )
}
