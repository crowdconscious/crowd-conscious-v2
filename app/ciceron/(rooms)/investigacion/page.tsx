import { EvidencePanel } from '../../_components/EvidencePanel'
import { EmptyState } from '../../_components/EmptyState'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { fixtureDofNotes } from '@/lib/ciceron/demo/fixtures'

export default function InvestigacionPage() {
  const evidence = fixtureDofNotes.map((n) => ({
    id: n.id,
    authority: n.authority,
    type: n.type,
    date: n.date,
    href: n.officialUrl,
    passage: n.passage,
  }))

  return (
    <div>
      <h1 className="cic-h1">{copy.investigacion.title}</h1>
      <p className="cic-lead">{copy.investigacion.lead}</p>
      <p className="cic-muted" style={{ marginTop: 12, fontSize: '0.85rem' }}>
        {copy.investigacion.coverage}
      </p>

      <section className="cic-section">
        <label htmlFor="cic-research-q" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          {copy.investigacion.ask}
        </label>
        <input
          id="cic-research-q"
          className="cic-input"
          style={{ marginTop: 8 }}
          placeholder={copy.investigacion.askPlaceholder}
          disabled
          aria-disabled="true"
        />
      </section>

      <section className="cic-section" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0,1fr) minmax(240px,320px)' }}>
        <EmptyState title={copy.investigacion.title}>
          <p style={{ margin: 0 }}>{copy.investigacion.stubAnswer}</p>
        </EmptyState>
        <EvidencePanel items={evidence} />
      </section>
    </div>
  )
}
