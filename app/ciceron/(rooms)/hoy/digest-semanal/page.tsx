import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PrintReportButton } from '../../../_components/PrintReportButton'
import { ThemeToggle } from '../../../_components/ThemeToggle'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { currentWeekWindow } from '@/lib/ciceron/deadlines/week-window-pure'
import { loadDeadlines } from '@/lib/ciceron/demo/data'
import { loadHoyBriefing } from '@/lib/ciceron/demo/monitor-data'
import { buildWeeklyDigestPreview } from '@/lib/ciceron/demo/weekly-digest-pure'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export default async function DigestSemanalPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const [bulletins, { deadlines }, briefing] = await Promise.all([
    loadBulletinBoard(persona),
    loadDeadlines(persona),
    loadHoyBriefing(persona),
  ])

  const week = currentWeekWindow()
  const weekStart = week.startIso
  const weekEnd = week.endIso

  // One row per client (first hit), with real acuerdo + expediente.
  const seenClients = new Set<string>()
  const movements = []
  for (const h of bulletins.hits) {
    const name = h.clientName?.trim()
    if (!name || seenClients.has(name)) continue
    seenClients.add(name)
    movements.push({
      id: h.id,
      clientName: name,
      acuerdo: h.summary ?? 'acuerdo publicado en lista',
      expedienteNumber: h.expedienteNumber,
      courtName: h.courtName,
    })
  }

  const allDeadlines = deadlines
    .filter((d): d is typeof d & { dueAt: string } => Boolean(d.dueAt))
    .map((d) => ({
      id: d.id,
      clientName: d.clientName,
      label: d.label,
      dueAt: d.dueAt,
    }))

  const reviews = briefing.reviews.map((r) => ({
    id: r.id,
    title: r.title,
    clientName: r.clientName,
    dueLabel: r.due,
  }))

  const digest = buildWeeklyDigestPreview({
    partnerName: persona.displayName,
    weekStartIso: weekStart,
    weekEndIso: weekEnd,
    movements,
    deadlines: allDeadlines,
    reviews,
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
        <p className="cic-digest-headline">
          <strong>{digest.headline}</strong>
        </p>
        <p>{copy.digest.intro}</p>

        <section aria-labelledby="digest-movements">
          <h2 id="digest-movements" className="cic-digest-section-title">
            {copy.digest.movementsTitle}
          </h2>
          {digest.movements.length === 0 ? (
            <p className="cic-muted">{copy.digest.quietNote}</p>
          ) : (
            <ul className="cic-digest-bullets">
              {digest.movements.map((b) => (
                <li key={b.id}>{b.text}</li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="digest-deadlines">
          <h2 id="digest-deadlines" className="cic-digest-section-title">
            {copy.digest.deadlinesTitle}
          </h2>
          {digest.deadlines.length === 0 ? (
            <p className="cic-muted">{copy.digest.quietNote}</p>
          ) : (
            <ul className="cic-digest-bullets">
              {digest.deadlines.map((b) => (
                <li key={b.id}>{b.text}</li>
              ))}
            </ul>
          )}
        </section>

        {digest.upcomingDeadlines.length > 0 ? (
          <section aria-labelledby="digest-upcoming">
            <h2 id="digest-upcoming" className="cic-digest-section-title">
              {copy.digest.upcomingDeadlinesTitle}
            </h2>
            <ul className="cic-digest-bullets">
              {digest.upcomingDeadlines.map((b) => (
                <li key={b.id}>{b.text}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="digest-reviews">
          <h2 id="digest-reviews" className="cic-digest-section-title">
            {copy.digest.reviewsTitle}
          </h2>
          {digest.reviews.length === 0 ? (
            <p className="cic-muted">{copy.digest.quietNote}</p>
          ) : (
            <ul className="cic-digest-bullets">
              {digest.reviews.map((b) => (
                <li key={b.id}>{b.text}</li>
              ))}
            </ul>
          )}
        </section>

        <p className="cic-muted" style={{ marginTop: 20 }}>
          {digest.closing}
        </p>
      </article>
    </div>
  )
}
