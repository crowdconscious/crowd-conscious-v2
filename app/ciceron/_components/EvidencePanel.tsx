'use client'

import { copy } from '@/lib/ciceron/copy/es-MX'
import { SourceChip } from './SourceChip'

export function EvidencePanel({
  items,
  activeCite,
}: {
  items: Array<{
    id: string
    n: number
    authority: string
    type: string
    date: string
    href: string
    passage: string
  }>
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
          items.map((item) => (
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
                <SourceChip
                  authority={item.authority}
                  type={item.type}
                  date={item.date}
                  href={item.href}
                />
              </div>
              <p className="cic-legal" style={{ fontSize: '0.95rem', marginTop: 8 }}>
                <mark>{item.passage}</mark>
              </p>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
