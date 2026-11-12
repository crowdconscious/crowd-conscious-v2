import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DisclosureCard } from '../../_components/DisclosureCard'
import { DeadlineMarker } from '../../_components/DeadlineMarker'
import { ReviewBadge } from '../../_components/ReviewBadge'
import { OnboardingChecklist } from '../../_components/OnboardingChecklist'
import { FeedbackSuggest } from '../../_components/FeedbackSuggest'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadDeadlines } from '@/lib/ciceron/demo/data'
import { loadHoyBriefing } from '@/lib/ciceron/demo/monitor-data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { loadOnboarding } from '@/lib/ciceron/engagement/onboarding'
import { loadFeedbackSuggestion } from '@/lib/ciceron/engagement/feedback-loop'
import { loadHoyEngagement } from '@/lib/ciceron/engagement/resume'
import { loadFirmBudgetStatus } from '@/lib/ciceron/gateway/budget'
import { recordCiceronEvent } from '@/lib/ciceron/events'

export default async function HoyPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const [briefing, { deadlines }, onboarding, suggestion, engagement, budget] =
    await Promise.all([
      loadHoyBriefing(persona),
      loadDeadlines(persona),
      loadOnboarding(persona),
      loadFeedbackSuggestion(persona),
      loadHoyEngagement(persona),
      loadFirmBudgetStatus(persona.firmId),
    ])

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'hoy', is_demo: true },
  })

  const matchItems = [...briefing.byClient.values()].flat()

  return (
    <div>
      <h1 className="cic-h1">{copy.hoy.title}</h1>
      <p className="cic-lead">{copy.hoy.lead}</p>

      <p className="cic-hoy-links">
        <Link href="/ciceron/hoy/briefing">{copy.engagement.openBriefing}</Link>
        {(persona.role === 'socio' || persona.role === 'admin') && (
          <>
            {' · '}
            <Link href="/ciceron/hoy/resumen-semanal">{copy.engagement.openWeekly}</Link>
          </>
        )}
      </p>

      {budget.researchPaused ? (
        <section className="cic-section cic-budget-paused" aria-labelledby="hoy-budget">
          <h2 id="hoy-budget" className="cic-h2">
            {copy.engagement.budgetPausedTitle}
          </h2>
          <p>{copy.engagement.budgetPausedBody}</p>
          {budget.alertMessage ? (
            <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
              {budget.alertMessage}
            </p>
          ) : null}
        </section>
      ) : budget.alertMessage ? (
        <p className="cic-muted" role="status" style={{ fontSize: '0.9rem' }}>
          {budget.alertMessage}
        </p>
      ) : null}

      <OnboardingChecklist state={onboarding} />

      {engagement.resume ? (
        <section className="cic-section" aria-labelledby="hoy-resume">
          <h2 id="hoy-resume" className="cic-h2">
            {copy.engagement.continueTitle}
          </h2>
          <p>
            <Link href={engagement.resume.href}>{engagement.resume.label}</Link>
          </p>
        </section>
      ) : null}

      {engagement.savedViews.length > 0 ? (
        <section className="cic-section" aria-labelledby="hoy-views">
          <h2 id="hoy-views" className="cic-h2">
            {copy.engagement.savedViewsTitle}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {engagement.savedViews.map((v) => (
              <li key={v.id}>
                <Link href={v.href}>{v.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {suggestion ? <FeedbackSuggest suggestion={suggestion} /> : null}

      <section className="cic-section" aria-labelledby="hoy-outlook">
        <div className="cic-card cic-demo-path">
          <h2 id="hoy-outlook" className="cic-h2" style={{ fontSize: '1.05rem', marginTop: 0 }}>
            {copy.m365.demoPathTitle}
          </h2>
          <p className="cic-muted" style={{ marginTop: 6 }}>
            {copy.m365.demoPathLead}
          </p>
          <ol className="cic-demo-steps">
            <li>
              <Link href="/ciceron/expedientes/outlook">{copy.m365.demoStepConnect}</Link>
            </li>
            <li>
              <Link href="/ciceron/expedientes/outlook">{copy.m365.demoStepArchive}</Link>
            </li>
            <li>
              <Link href="/ciceron/expedientes/calendario">{copy.m365.demoStepCalendar}</Link>
            </li>
            <li>
              <Link href="/ciceron/expedientes/case-1">{copy.m365.demoStepNotify}</Link>
            </li>
          </ol>
        </div>
      </section>

      <section className="cic-section" aria-labelledby="hoy-matches">
        <h2 id="hoy-matches" className="cic-h2">
          {copy.hoy.matches}
        </h2>
        {briefing.emptyToday && briefing.source === 'schema' ? (
          <p className="cic-muted">
            {copy.hoy.emptyToday}{' '}
            <span>
              ({copy.hoy.reviewedCount}: {briefing.totalClassified})
            </span>
          </p>
        ) : null}
        {[...briefing.byClient.entries()].map(([clientName, items]) => (
          <div key={clientName} style={{ marginBottom: 20 }}>
            <h3 className="cic-h2" style={{ fontSize: '1rem' }}>
              {clientName}
            </h3>
            {items.map((n) => (
              <DisclosureCard
                key={n.id}
                title={n.title}
                clientName={n.clientName}
                reason={n.reason}
                action={n.action}
                passage={n.passage}
                authority={n.authority}
                type={n.type}
                date={n.date}
                officialUrl={n.officialUrl}
                review={n.review}
              />
            ))}
          </div>
        ))}
        {matchItems.length === 0 && briefing.source === 'fixture' ? (
          <p className="cic-muted">{copy.empty.hoyNone}</p>
        ) : null}
        <p style={{ marginTop: 12 }}>
          <Link href="/ciceron/monitor-dof" className="cic-muted" style={{ fontSize: '0.9rem' }}>
            {copy.rooms['monitor-dof']} →
          </Link>
        </p>
      </section>

      {briefing.unopenedYesterday.length > 0 ? (
        <section className="cic-section" aria-labelledby="hoy-unopened">
          <h2 id="hoy-unopened" className="cic-h2">
            {copy.hoy.unopened}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {briefing.unopenedYesterday.map((i) => (
              <li key={i.id}>
                <Link href="/ciceron/monitor-dof">{i.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="cic-section" aria-labelledby="hoy-reviews">
        <h2 id="hoy-reviews" className="cic-h2">
          {copy.hoy.reviews}
        </h2>
        <ul className="cic-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {briefing.reviews.map((r) => (
            <li key={r.id} className="cic-card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{r.title}</strong>
                  <p className="cic-muted" style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
                    {r.clientName} · {copy.revision.due} {r.due}
                  </p>
                </div>
                <ReviewBadge state={r.state} />
              </div>
              <p style={{ margin: '8px 0 0' }}>
                <Link href="/ciceron/revision" className="cic-muted" style={{ fontSize: '0.85rem' }}>
                  {copy.rooms.revision} →
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="cic-section" aria-labelledby="hoy-deadlines">
        <h2 id="hoy-deadlines" className="cic-h2">
          {copy.hoy.deadlines}
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="cic-stack">
          {deadlines.map((d) => (
            <li key={d.id}>
              <DeadlineMarker label={`${d.label} — ${d.due}`} urgency={d.urgency} />
              <span className="cic-muted" style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                {d.clientName}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
