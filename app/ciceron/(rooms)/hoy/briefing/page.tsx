import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { generateMorningBriefing } from '@/lib/ciceron/engagement/briefing'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export default async function MorningBriefingPreviewPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const briefing = await generateMorningBriefing(persona)

  return (
    <div>
      <h1 className="cic-h1">{copy.engagement.morningTitle}</h1>
      <p className="cic-lead">{copy.engagement.morningLead}</p>
      <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
        {copy.engagement.morningPreview}
      </p>
      {briefing.emailSimulated ? (
        <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
          {copy.engagement.emailSimulated}
        </p>
      ) : null}

      {briefing.empty && briefing.alreadyShownEmptyToday ? (
        <p className="cic-muted">{copy.engagement.morningEmpty}</p>
      ) : (
        <ul className="cic-briefing-list">
          {briefing.lines.map((line, i) => (
            <li key={`${line.kind}-${i}`}>
              <Link href={line.href}>{line.text}</Link>
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: 24 }}>
        <Link href="/ciceron/hoy" className="cic-muted">
          ← {copy.rooms.hoy}
        </Link>
      </p>
    </div>
  )
}
