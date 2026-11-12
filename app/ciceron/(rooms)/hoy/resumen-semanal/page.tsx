import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { generateWeeklySocioSummary } from '@/lib/ciceron/engagement/briefing'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export default async function WeeklySocioSummaryPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)
  if (persona.role !== 'socio' && persona.role !== 'admin') {
    redirect(`${CICERON_BASE}/hoy`)
  }

  const summary = await generateWeeklySocioSummary(persona)

  return (
    <div>
      <h1 className="cic-h1">{copy.engagement.weeklyTitle}</h1>
      <p className="cic-lead">{copy.engagement.weeklyLead}</p>
      {summary.emailSimulated ? (
        <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
          {copy.engagement.emailSimulated}
        </p>
      ) : null}

      <ul className="cic-briefing-list">
        {summary.lines.map((line, i) => (
          <li key={`${line.kind}-${i}`}>
            <Link href={line.href}>{line.text}</Link>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: 24 }}>
        <Link href="/ciceron/hoy" className="cic-muted">
          ← {copy.rooms.hoy}
        </Link>
      </p>
    </div>
  )
}
