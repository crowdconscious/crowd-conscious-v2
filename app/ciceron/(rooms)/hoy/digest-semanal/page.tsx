import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PrintReportButton } from '../../../_components/PrintReportButton'
import { ThemeToggle } from '../../../_components/ThemeToggle'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { currentWeekWindow } from '@/lib/ciceron/deadlines/week-window-pure'
import { countDeadlinesInCurrentWeek } from '@/lib/ciceron/deadlines/week-window-pure'
import { loadDeadlines } from '@/lib/ciceron/demo/data'
import { loadHoyBriefing } from '@/lib/ciceron/demo/monitor-data'
import { buildWeeklyDigestPreview } from '@/lib/ciceron/demo/weekly-digest-pure'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import {
  buildSuMananaSummary,
} from '@/lib/ciceron/demo/su-manana-pure'

export default async function DigestSemanalPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const [bulletins, { deadlines }, briefing] = await Promise.all([
    loadBulletinBoard(persona),
    loadDeadlines(persona),
    loadHoyBriefing(persona),
  ])

  const dueAts = deadlines.map((d) => d.dueAt).filter((v): v is string => Boolean(v))
  const week = currentWeekWindow()
  const morning = buildSuMananaSummary({
    bulletinNoveltyKeys: bulletins.hits.map((h) => h.clientName ?? h.matterId ?? h.id),
    dofNoveltyKeys: briefing.emptyToday ? [] : [...briefing.byClient.keys()],
    deadlinesThisWeek: countDeadlinesInCurrentWeek(dueAts),
    reviewsPending: briefing.reviews.length,
    actions: [],
  })
  const moved = [
    ...new Set(
      bulletins.hits
        .map((h) => h.clientName)
        .filter((n): n is string => Boolean(n))
    ),
  ]

  const digest = buildWeeklyDigestPreview({
    partnerName: persona.displayName,
    weekStartIso: week.startIso,
    weekEndIso: week.endIso,
    movedClients: moved,
    plazosCount: morning.metrics.find((m) => m.id === 'plazosEstaSemana')?.value ?? 0,
    reviewsPending: morning.metrics.find((m) => m.id === 'pendientesRevision')?.value ?? 0,
  })

  return (
    <div className="cic-digest-preview cic-print-report">
      <p className="cic-hoy-links no-print">
        <Link href="/ciceron/hoy">{copy.hoy.title}</Link>
        {' · '}
        <Link href="/ciceron/hoy/resumen-semanal">{copy.engagement.openWeekly}</Link>
      </p>
      <div className="cic-digest-toolbar no-print">
        <h1 className="cic-h1" style={{ margin: 0 }}>
          {copy.digest.title}
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeToggle />
          <PrintReportButton />
        </div>
      </div>
      <p className="cic-lead no-print">{copy.digest.lead}</p>
      <p className="cic-demo-inline">{copy.demoLabel}</p>

      <article className="cic-digest-mail" aria-label={copy.digest.previewLabel}>
        <div className="cic-print-letterhead" aria-hidden="true">
          <strong>{copy.brand}</strong>
          <span>{copy.demoLabel}</span>
        </div>
        <p className="cic-digest-sim-badge">{copy.digest.simulatedBadge}</p>
        <p className="cic-digest-meta">
          <strong>{copy.digest.subjectLabel}:</strong> {digest.subject}
        </p>
        <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
          {digest.weekLabel}
        </p>
        <p>{digest.greeting}</p>
        <p>{copy.digest.intro}</p>
        <ul className="cic-digest-bullets">
          {digest.bullets.map((b) => (
            <li key={b.id}>{b.text}</li>
          ))}
        </ul>
        <p className="cic-muted" style={{ marginTop: 20 }}>
          {digest.closing}
        </p>
      </article>
    </div>
  )
}
