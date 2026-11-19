import Link from 'next/link'
import type { ReactNode } from 'react'
import { TermTip } from './TermTip'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type {
  SuMananaAction,
  SuMananaMetric,
  SuMananaMetricId,
} from '@/lib/ciceron/demo/su-manana-pure'

const METRIC_LABEL: Record<SuMananaMetricId, string> = {
  asuntosVigilados: copy.hoy.metrics.asuntosVigilados,
  novedadesHoy: copy.hoy.metrics.novedadesHoy,
  plazosEstaSemana: copy.hoy.metrics.plazosEstaSemana,
  estadosCubiertos: copy.hoy.metrics.estadosCubiertos,
}

export type DeniedActionNote = {
  actionIdPrefix?: string
  kind?: SuMananaAction['kind']
  title: string
  reason: string
}

export function SuMananaHero({
  metrics,
  actions,
  deniedNotes = [],
  dailyLine,
  coverageHero = null,
}: {
  metrics: SuMananaMetric[]
  actions: SuMananaAction[]
  /** RBAC/ABAC notes shown next to the related action, not as a home hero. */
  deniedNotes?: DeniedActionNote[]
  /** Deterministic one-liner from the same sources as the metric cards. */
  dailyLine?: string | null
  /** Socio: partner coverage map sits with the KPI strip above the fold. */
  coverageHero?: ReactNode
}) {
  function noteFor(action: SuMananaAction): DeniedActionNote | undefined {
    return deniedNotes.find(
      (n) =>
        (n.kind && n.kind === action.kind) ||
        (n.actionIdPrefix && action.id.startsWith(n.actionIdPrefix))
    )
  }

  const orphanNotes = deniedNotes.filter(
    (n) =>
      !actions.some(
        (a) =>
          (n.kind && n.kind === a.kind) ||
          (n.actionIdPrefix && a.id.startsWith(n.actionIdPrefix))
      )
  )

  // Show each ABAC/RBAC reason once (first matching row), not on every denied item.
  const denialTextShown = new Set<string>()
  function denialKey(n: DeniedActionNote): string {
    return `${n.kind ?? ''}|${n.actionIdPrefix ?? ''}|${n.reason}`
  }

  return (
    <section className="cic-su-manana" aria-labelledby="su-manana-heading">
      <h1 id="su-manana-heading" className="cic-h1">
        {copy.hoy.title}
      </h1>
      <p className="cic-lead">
        {copy.hoy.lead}{' '}
        <TermTip term="DOF" tip={copy.tips.dof} /> ·{' '}
        <TermTip term="boletín" tip={copy.tips.boletin} /> ·{' '}
        <TermTip term="plazo" tip={copy.tips.plazo} />
      </p>

      {dailyLine ? (
        <p className="cic-hoy-daily-line" role="status" aria-label={copy.hoy.dailyLineLabel}>
          <span className="cic-hoy-daily-line-text">{dailyLine}</span>
          <span className="cic-demo-inline cic-hoy-daily-line-tag">{copy.hoy.dailyLineDemoNote}</span>
        </p>
      ) : null}

      <div
        className={
          coverageHero ? 'cic-hoy-partner-hero-band' : 'cic-hoy-partner-hero-band is-metrics-only'
        }
      >
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
        {coverageHero}
      </div>

      <div className="cic-su-manana-actions" aria-labelledby="su-manana-actions">
        <h2 id="su-manana-actions" className="cic-h2">
          {copy.hoy.actionsTitle}
        </h2>
        <p className="cic-muted cic-su-manana-actions-lead">{copy.hoy.actionsLead}</p>
        {actions.length === 0 && orphanNotes.length === 0 ? (
          <p className="cic-muted" role="status">
            {copy.hoy.actionsEmpty}
          </p>
        ) : (
          <ol className="cic-su-manana-action-list">
            {actions.map((a, index) => {
              const denied = noteFor(a)
              let showDenialText = false
              if (denied) {
                const key = denialKey(denied)
                if (!denialTextShown.has(key)) {
                  denialTextShown.add(key)
                  showDenialText = true
                }
              }
              return (
                <li
                  key={a.id}
                  className={`cic-su-manana-action${denied ? ' is-denied' : ''}`}
                >
                  <span className="cic-su-manana-action-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="cic-su-manana-action-body">
                    <span className="cic-su-manana-action-kind">
                      {copy.hoy.actionKinds[a.kind]}
                    </span>
                    {denied ? (
                      <>
                        <span
                          className="cic-su-manana-action-title is-disabled"
                          title={denied.reason}
                          aria-disabled="true"
                        >
                          {a.title}
                        </span>
                        {showDenialText ? (
                          <span className="cic-muted cic-inline-denied" role="note">
                            {denied.title}: {denied.reason}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <Link href={a.href} className="cic-su-manana-action-title">
                        {a.title}
                      </Link>
                    )}
                    {a.detail ? (
                      <span className="cic-muted cic-su-manana-action-detail">{a.detail}</span>
                    ) : null}
                  </div>
                </li>
              )
            })}
            {orphanNotes.map((n) => (
              <li key={n.title} className="cic-su-manana-action is-denied">
                <span className="cic-su-manana-action-index" aria-hidden="true">
                  —
                </span>
                <div className="cic-su-manana-action-body">
                  <span
                    className="cic-su-manana-action-title is-disabled"
                    title={n.reason}
                    aria-disabled="true"
                  >
                    {n.title}
                  </span>
                  <span className="cic-muted cic-inline-denied" role="note">
                    {n.reason}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
