import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadOutlookCalendar } from '@/lib/ciceron/case-files/data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

function kindLabel(kind: string): string {
  switch (kind) {
    case 'hearing':
      return 'Audiencia'
    case 'deadline':
      return 'Plazo'
    case 'dof_alert':
      return 'Alerta DOF'
    default:
      return 'Evento'
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  })
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ lawyer?: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)
  const sp = await searchParams
  const { events, source } = await loadOutlookCalendar(persona, {
    lawyerId: sp.lawyer,
  })

  return (
    <div>
      <p style={{ marginBottom: 8 }}>
        <Link href="/ciceron/expedientes" className="cic-muted" style={{ fontSize: '0.9rem' }}>
          ← {copy.rooms.expedientes}
        </Link>
      </p>
      <h1 className="cic-h1">{copy.m365.calendarTitle}</h1>
      <p className="cic-lead">{copy.m365.calendarLead}</p>
      <p className="cic-demo-inline">{copy.demoLabel}</p>

      <form method="get" className="cic-card" style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
        <label style={{ flex: 1 }}>
          <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
            {copy.expedientes.lawyerFilter}
          </span>
          <input
            className="cic-input"
            name="lawyer"
            defaultValue={sp.lawyer ?? ''}
            placeholder="Nombre o UUID"
            style={{ marginTop: 4, width: '100%' }}
          />
        </label>
        <button type="submit" className="cic-btn" style={{ alignSelf: 'end' }}>
          {copy.expedientes.filters}
        </button>
      </form>

      <div className="cic-outlook-cal">
        <div className="cic-outlook-cal-head">
          <span>Outlook</span>
          <span className="cic-muted">{source === 'fixture' ? copy.demoLabel : 'Despacho Demo'}</span>
        </div>
        <ul className="cic-outlook-cal-list">
          {events.map((ev) => (
            <li key={ev.id} className={`cic-outlook-cal-item cic-cal-${ev.eventKind}`}>
              <div className="cic-outlook-cal-kind">{kindLabel(ev.eventKind)}</div>
              <div>
                <strong>{ev.title.replace(/^Datos de demostración\.\s*/i, '')}</strong>
                <div className="cic-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {formatWhen(ev.startsAt)}
                  {ev.clientName ? ` · ${ev.clientName}` : ''}
                  {ev.caseFileNumber ? ` · ${ev.caseFileNumber}` : ''}
                  {ev.syncedFromCiceron ? ' · sincronizado desde Cicerón' : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
