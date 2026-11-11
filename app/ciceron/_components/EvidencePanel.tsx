'use client'

import { copy } from '@/lib/ciceron/copy/es-MX'

export type EvidenceItem = {
  id: string
  n: number
  authority: string
  title: string | null
  type: string
  date: string
  section: string | null
  edition: string | null
  href: string | null
  passage: string
}

export function EvidencePanel({
  items,
  activeCite,
}: {
  items: EvidenceItem[]
  activeCite?: number | null
}) {
  return (
    <aside className="cic-card" aria-label="Evidencia">
      <h2 className="cic-h2" style={{ fontSize: '1rem', marginBottom: 12 }}>
        Evidencia
      </h2>
      <div className="cic-stack">
        {items.length === 0 ? (
          <p className="cic-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            {copy.investigacion.evidenceEmpty}
          </p>
        ) : (
          items.map((item) => {
            const metaBits = [
              item.date !== '—' ? item.date : null,
              item.section ? `Sección ${item.section}` : null,
              item.edition,
            ].filter(Boolean)
            const heading = item.title || item.authority || 'Nota DOF'
            const sub = [item.authority && item.title ? item.authority : null, ...metaBits]
              .filter(Boolean)
              .join(' · ')

            return (
              <div
                key={item.id}
                id={`cic-evidence-${item.n}`}
                className={`cic-evidence-card${activeCite === item.n ? ' cic-evidence-card-active' : ''}`}
                data-cite={item.n}
              >
                <div className="cic-evidence-head">
                  <span className="cic-evidence-num" aria-hidden="true">
                    {item.n}
                  </span>
                  <div className="cic-evidence-meta">
                    <div className="cic-evidence-title">{heading}</div>
                    {sub ? <div className="cic-evidence-sub">{sub}</div> : null}
                    {item.href ? (
                      <a
                        className="cic-source"
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={copy.components.openSource}
                      >
                        {copy.components.openSource}
                      </a>
                    ) : (
                      <span className="cic-muted" style={{ fontSize: '0.8rem' }}>
                        {item.type}
                      </span>
                    )}
                  </div>
                </div>
                <p className="cic-legal cic-evidence-excerpt">
                  <mark>{item.passage}</mark>
                </p>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
