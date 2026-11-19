import Link from 'next/link'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type {
  SuMananaAction,
  SuMananaMetric,
  SuMananaMetricId,
} from '@/lib/ciceron/demo/su-manana-pure'

const METRIC_LABEL: Record<SuMananaMetricId, string> = {
  asuntosConNovedad: copy.hoy.metrics.asuntosConNovedad,
  plazosEstaSemana: copy.hoy.metrics.plazosEstaSemana,
  pendientesRevision: copy.hoy.metrics.pendientesRevision,
}

export function SuMananaHero({
  metrics,
  actions,
}: {
  metrics: SuMananaMetric[]
  actions: SuMananaAction[]
}) {
  return (
    <section className="cic-su-manana" aria-labelledby="su-manana-heading">
      <h1 id="su-manana-heading" className="cic-h1">
        {copy.hoy.title}
      </h1>
      <p className="cic-lead">{copy.hoy.lead}</p>

      <ul className="cic-su-manana-metrics" aria-label={copy.hoy.title}>
        {metrics.map((m) => (
          <li key={m.id} className="cic-su-manana-metric">
            <span className="cic-su-manana-metric-value" aria-hidden="true">
              {m.value}
            </span>
            <span className="cic-su-manana-metric-label">
              <span className="cic-sr-only">{`${m.value} `}</span>
              {METRIC_LABEL[m.id]}
            </span>
          </li>
        ))}
      </ul>

      <div className="cic-su-manana-actions" aria-labelledby="su-manana-actions">
        <h2 id="su-manana-actions" className="cic-h2">
          {copy.hoy.actionsTitle}
        </h2>
        <p className="cic-muted cic-su-manana-actions-lead">{copy.hoy.actionsLead}</p>
        {actions.length === 0 ? (
          <p className="cic-muted" role="status">
            {copy.hoy.actionsEmpty}
          </p>
        ) : (
          <ol className="cic-su-manana-action-list">
            {actions.map((a, index) => (
              <li key={a.id} className="cic-su-manana-action">
                <span className="cic-su-manana-action-index" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="cic-su-manana-action-body">
                  <span className="cic-su-manana-action-kind">
                    {copy.hoy.actionKinds[a.kind]}
                  </span>
                  <Link href={a.href} className="cic-su-manana-action-title">
                    {a.title}
                  </Link>
                  {a.detail ? (
                    <span className="cic-muted cic-su-manana-action-detail">{a.detail}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
