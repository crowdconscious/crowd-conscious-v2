import Link from 'next/link'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadMetricsDashboard } from '@/lib/ciceron/engagement/metrics'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { MetricasClient } from './MetricasClient'

export default async function MetricasAdminPage() {
  const persona = await getCiceronDemoSession()
  const data = await loadMetricsDashboard()

  if (persona) {
    await recordCiceronEvent({
      name: 'room_opened',
      firmId: persona.firmId,
      userId: persona.id,
      properties: { room: 'admin-metricas', is_demo: true },
    })
  }

  return (
    <div>
      <h1 className="cic-h1">{copy.adminMetricas.title}</h1>
      <p className="cic-lead">{copy.adminMetricas.lead}</p>
      <p style={{ marginBottom: 16 }}>
        <Link href="/ciceron/admin/fuentes" className="cic-muted" style={{ fontSize: '0.9rem' }}>
          {copy.adminMetricas.linkFuentes} →
        </Link>
      </p>
      <MetricasClient data={data} />
    </div>
  )
}
