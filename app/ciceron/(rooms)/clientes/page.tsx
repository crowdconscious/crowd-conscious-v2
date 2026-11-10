import { ClientTag } from '../../_components/ClientTag'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { fixtureClients } from '@/lib/ciceron/demo/fixtures'

export default function ClientesPage() {
  return (
    <div>
      <h1 className="cic-h1">{copy.clientes.title}</h1>
      <p className="cic-lead">{copy.clientes.lead}</p>

      <section className="cic-section cic-stack">
        {fixtureClients.map((c) => (
          <article key={c.id} className="cic-card" style={{ margin: 0 }}>
            <h2 className="cic-h2" style={{ fontSize: '1.1rem' }}>
              <ClientTag name={c.name} />
            </h2>
            <p className="cic-muted" style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
              {c.industry}
            </p>
            <div style={{ marginTop: 16 }}>
              <h3 style={{ margin: 0, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--cic-muted)' }}>
                {copy.clientes.matters}
              </h3>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {c.matters.map((m) => (
                  <li key={m.id}>{m.title}</li>
                ))}
              </ul>
            </div>
            <div style={{ marginTop: 16 }}>
              <h3 style={{ margin: 0, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--cic-muted)' }}>
                {copy.clientes.watch}
              </h3>
              <p className="cic-legal" style={{ fontSize: '1rem', marginTop: 8 }}>
                {c.watch}
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
