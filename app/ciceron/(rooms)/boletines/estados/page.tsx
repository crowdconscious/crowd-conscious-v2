import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  FEDERAL_DIRECTORY,
  stateDirectorySorted,
  uploadPrefillHref,
  type BulletinAccessType,
  type BulletinAutomationStatus,
  type UrlVerificationStatus,
} from '@/lib/ciceron/boletines/state-directory'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import { BoletinesUploadControls } from '../BoletinesUploadControls'

function accessLabel(t: BulletinAccessType): string {
  return copy.boletines.statesAccess[t]
}

function automationLabel(t: BulletinAutomationStatus): string {
  return copy.boletines.statesAutomation[t]
}

function urlStatusLabel(t: UrlVerificationStatus): string {
  return copy.boletines.statesUrlStatus[t]
}

export default async function BoletinesEstadosPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const canUpload =
    persona.role === 'socio' || persona.role === 'asociado' || persona.role === 'admin'

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'boletines-estados', is_demo: true },
  })

  const states = stateDirectorySorted()

  return (
    <div>
      <h1 className="cic-h1">{copy.boletines.statesTitle}</h1>
      <p className="cic-lead">{copy.boletines.statesLead}</p>
      <p className="cic-hoy-links">
        <Link href="/ciceron/boletines">{copy.rooms.boletines}</Link>
        {' · '}
        <Link href="/ciceron/boletines/coordinador">{copy.boletines.coordinatorLink}</Link>
      </p>

      <div style={{ margin: '16px 0' }}>
        <Suspense fallback={null}>
          <BoletinesUploadControls canUpload={canUpload} />
        </Suspense>
      </div>

      <section className="cic-section" aria-labelledby="bol-estados">
        <h2 id="bol-estados" className="cic-h2">
          {copy.boletines.statesColEntidad}
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="cic-table">
            <thead>
              <tr>
                <th scope="col">{copy.boletines.statesColEntidad}</th>
                <th scope="col">{copy.boletines.statesColFuente}</th>
                <th scope="col">{copy.boletines.statesColAcceso}</th>
                <th scope="col">{copy.boletines.statesColAutomatizacion}</th>
                <th scope="col">{copy.boletines.statesColAccion}</th>
              </tr>
            </thead>
            <tbody>
              {states.map((s) => (
                <tr key={s.sourceKey}>
                  <td>
                    <strong>{s.stateName}</strong>
                    <div className="cic-muted" style={{ fontSize: '0.8rem' }}>
                      {urlStatusLabel(s.urlStatus)}
                    </div>
                  </td>
                  <td>
                    <div>{s.displayName}</div>
                    {s.note ? (
                      <div className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                        {s.note}
                      </div>
                    ) : null}
                  </td>
                  <td>{accessLabel(s.accessType)}</td>
                  <td>{automationLabel(s.automation)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <a
                        href={s.landingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cic-muted"
                        style={{ fontSize: '0.9rem' }}
                      >
                        {copy.boletines.statesOpenSource}
                      </a>
                      {canUpload ? (
                        <Link
                          href={uploadPrefillHref(s.stateCode)}
                          className="cic-btn cic-btn-secondary"
                          style={{ fontSize: '0.85rem', textAlign: 'center' }}
                        >
                          {copy.boletines.statesUploadPrefill}
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cic-section" aria-labelledby="bol-federal">
        <h2 id="bol-federal" className="cic-h2">
          {copy.boletines.statesFederalTitle}
        </h2>
        <ul className="cic-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {FEDERAL_DIRECTORY.map((f) => (
            <li key={f.sourceKey} className="cic-card" style={{ margin: 0 }}>
              <strong>{f.displayName}</strong>
              <p className="cic-muted" style={{ fontSize: '0.9rem', margin: '6px 0' }}>
                {accessLabel(f.accessType)} · {automationLabel(f.automation)}
                {f.note ? ` · ${f.note}` : ''}
              </p>
              <a href={f.landingUrl} target="_blank" rel="noopener noreferrer">
                {copy.boletines.statesOpenSource}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
