import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { M365_DEMO_PERMISSIONS } from '@/lib/ciceron/m365/types'
import { loadArchiveDocs, loadM365Status } from '@/lib/ciceron/case-files/data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { OutlookConnectControls } from './OutlookConnectControls'

export default async function OutlookConnectPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const [{ status }, { docs }] = await Promise.all([
    loadM365Status(persona),
    loadArchiveDocs(persona),
  ])

  return (
    <div>
      <p style={{ marginBottom: 8 }}>
        <Link href="/ciceron/expedientes" className="cic-muted" style={{ fontSize: '0.9rem' }}>
          ← {copy.rooms.expedientes}
        </Link>
      </p>
      <h1 className="cic-h1">{copy.m365.consentTitle}</h1>
      <p className="cic-lead">{copy.m365.consentLead}</p>
      <p className="cic-demo-inline">{copy.demoLabel}</p>

      <div className="cic-m365-consent cic-card">
        <div className="cic-m365-consent-brand">
          <span className="cic-m365-mark" aria-hidden="true">
            C
          </span>
          <div>
            <strong>Cicerón.ai</strong>
            <div className="cic-muted" style={{ fontSize: '0.85rem' }}>
              Simulación de consentimiento Microsoft 365 — no es el inicio de sesión real
            </div>
          </div>
        </div>

        <h2 className="cic-h2" style={{ fontSize: '1rem', marginTop: 16 }}>
          {copy.m365.consentPermissions}
        </h2>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          {M365_DEMO_PERMISSIONS.map((p) => (
            <li key={p.id} style={{ marginBottom: 8 }}>
              <strong>{p.label}</strong>
              <div className="cic-muted" style={{ fontSize: '0.85rem' }}>
                {p.description}
              </div>
            </li>
          ))}
        </ul>

        <OutlookConnectControls status={status} />
      </div>

      {status === 'connected' ? (
        <section className="cic-section" style={{ marginTop: 28 }}>
          <h2 className="cic-h2">{copy.m365.archiveTitle}</h2>
          <p className="cic-muted">{copy.m365.archiveLead}</p>
          <ul className="cic-archive-list">
            {docs.map((d) => (
              <li key={d.id} className="cic-card" style={{ marginTop: 10 }}>
                <div className="cic-muted" style={{ fontSize: '0.75rem' }}>
                  {d.folderPath} · {d.docDate}
                </div>
                <strong>{d.title}</strong>
                <p className="cic-legal" style={{ marginTop: 6, fontSize: '0.9rem' }}>
                  {d.excerpt}
                </p>
                <Link
                  href="/ciceron/investigacion?scope=firm"
                  className="cic-muted"
                  style={{ fontSize: '0.85rem' }}
                >
                  Buscar en Investigación →
                </Link>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 16 }}>
            <Link href="/ciceron/expedientes/calendario" className="cic-btn cic-btn-secondary">
              {copy.m365.demoStepCalendar}
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  )
}
