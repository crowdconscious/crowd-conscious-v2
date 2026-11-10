import { SourceChip } from './SourceChip'

export function EvidencePanel({
  items,
}: {
  items: Array<{
    id: string
    authority: string
    type: string
    date: string
    href: string
    passage: string
  }>
}) {
  return (
    <aside className="cic-card" aria-label="Evidencia">
      <h2 className="cic-h2" style={{ fontSize: '1rem', marginBottom: 12 }}>
        Evidencia
      </h2>
      <div className="cic-stack">
        {items.map((item) => (
          <div key={item.id}>
            <SourceChip
              authority={item.authority}
              type={item.type}
              date={item.date}
              href={item.href}
            />
            <p className="cic-legal" style={{ fontSize: '0.95rem', marginTop: 8 }}>
              <mark>{item.passage}</mark>
            </p>
          </div>
        ))}
      </div>
    </aside>
  )
}
