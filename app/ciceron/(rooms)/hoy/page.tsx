import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DisclosureCard } from '../../_components/DisclosureCard'
import { DeadlineMarker } from '../../_components/DeadlineMarker'
import { ReviewBadge } from '../../_components/ReviewBadge'
import { OnboardingChecklist } from '../../_components/OnboardingChecklist'
import { FeedbackSuggest } from '../../_components/FeedbackSuggest'
import { SuMananaHero, type DeniedActionNote } from '../../_components/SuMananaHero'
import { PartnerCoverageMap } from './PartnerCoverageMap'
import { WeekDeadlineStrip } from '../../_components/WeekDeadlineStrip'
import { DeadlineCountdown } from '../../_components/DeadlineCountdown'
import { PersonaStartPanel } from '../../_components/PersonaStartPanel'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { formatDateLongEs } from '@/lib/ciceron/copy/format-date'
import { loadDeadlines } from '@/lib/ciceron/demo/data'
import { loadHoyBriefing } from '@/lib/ciceron/demo/monitor-data'
import { countDeadlinesInCurrentWeek } from '@/lib/ciceron/deadlines/week-window-pure'
import {
  personaHomeKind,
  unavailableActionIdsFor,
  type UnavailableActionId,
} from '@/lib/ciceron/demo/persona-home-pure'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { buildEmptyHoyMessage } from '@/lib/ciceron/demo/empty-state-pure'
import {
  buildHoyDailyLine,
  soonestDueIso,
  weekdayNameEsFromIso,
} from '@/lib/ciceron/demo/hoy-daily-line-pure'
import { formatConsultHm } from '@/lib/ciceron/boletines/map-state-panel-pure'
import {
  buildSuMananaSummary,
  type SuMananaAction,
} from '@/lib/ciceron/demo/su-manana-pure'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { loadOnboarding } from '@/lib/ciceron/engagement/onboarding'
import { loadFeedbackSuggestion } from '@/lib/ciceron/engagement/feedback-loop'
import { loadHoyEngagement } from '@/lib/ciceron/engagement/resume'
import { loadFirmBudgetStatus } from '@/lib/ciceron/gateway/budget'
import { recordCiceronEvent } from '@/lib/ciceron/events'

export default async function HoyPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const [briefing, { deadlines }, onboarding, suggestion, engagement, budget, bulletins] =
    await Promise.all([
      loadHoyBriefing(persona),
      loadDeadlines(persona),
      loadOnboarding(persona),
      loadFeedbackSuggestion(persona),
      loadHoyEngagement(persona),
      loadFirmBudgetStatus(persona.firmId),
      loadBulletinBoard(persona),
    ])

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'hoy', is_demo: true },
  })

  const upcomingDeadlines = deadlines.slice(0, 12)
  const dueAts = upcomingDeadlines
    .map((d) => d.dueAt)
    .filter((v): v is string => Boolean(v))
  // Same Mon–Sun CDMX window as WeekDeadlineStrip (not urgency).
  const deadlinesThisWeek = countDeadlinesInCurrentWeek(dueAts)
  const homeKind = personaHomeKind(persona.role, persona.id)
  const unavailableIds = unavailableActionIdsFor(homeKind)

  function deniedNotesFor(ids: UnavailableActionId[]): DeniedActionNote[] {
    return ids.map((id) => {
      const item = copy.personaHome.unavailable[id]
      if (id === 'manual-queue-own') {
        return {
          kind: 'bulletin_manual' as const,
          actionIdPrefix: 'manual-',
          title: item.title,
          reason: item.reason,
        }
      }
      if (id === 'confirm-deadline') {
        return {
          kind: 'deadline' as const,
          title: item.title,
          reason: item.reason,
        }
      }
      return { title: item.title, reason: item.reason }
    })
  }

  // Denials sit beside the related action — never as a home hero above Su mañana.
  const deniedNotes = deniedNotesFor(unavailableIds)

  const actions: SuMananaAction[] = []

  for (const m of bulletins.manuals) {
    actions.push({
      id: `manual-${m.id}`,
      kind: 'bulletin_manual',
      priority: 0,
      href: '/ciceron/boletines/coordinador',
      title: `${copy.hoy.bulletinsManual}: ${m.stateName}`,
      detail: m.sourceName,
    })
  }

  for (const row of bulletins.board.filter((b) => b.status === 'fallo')) {
    actions.push({
      id: `fallo-${row.sourceId}`,
      kind: 'bulletin_manual',
      priority: 1,
      href: '/ciceron/boletines/coordinador',
      title: `${row.stateName}: ${row.statusLabel}`,
      detail: row.failureMessage ?? undefined,
    })
  }

  for (const r of briefing.reviews) {
    actions.push({
      id: `review-${r.id}`,
      kind: 'review',
      priority: 0,
      href: `/ciceron/revision/${r.id}`,
      title: r.title,
      detail: `${r.clientName} · ${copy.revision.due} ${r.due}`,
    })
  }

  for (const d of upcomingDeadlines.filter((x) => x.urgency === 'soon')) {
    actions.push({
      id: `deadline-${d.id}`,
      kind: 'deadline',
      priority: 0,
      href: '/ciceron/expedientes',
      title: d.label,
      detail: `${d.clientName} · ${d.due}`,
    })
  }

  for (const h of bulletins.hits.slice(0, 5)) {
    actions.push({
      id: `hit-${h.id}`,
      kind: 'bulletin_hit',
      priority: h.matchKind === 'exact' ? 0 : 1,
      href: h.caseFileId ? `/ciceron/expedientes/${h.caseFileId}` : '/ciceron/boletines',
      title: h.clientName ?? h.stateName,
      detail: [h.courtName, h.expedienteNumber, h.summary]
        .filter(Boolean)
        .join(' · '),
    })
  }

  if (!briefing.emptyToday) {
    let dofPriority = 0
    for (const [clientName, items] of briefing.byClient.entries()) {
      const first = items[0]
      if (!first) continue
      actions.push({
        id: `dof-${first.id}`,
        kind: 'dof_match',
        priority: dofPriority++,
        href: '/ciceron/monitor-dof',
        title: clientName,
        detail: first.title,
      })
    }
  }

  const morning = buildSuMananaSummary({
    bulletinNoveltyKeys: bulletins.hits.map((h) => h.clientName ?? h.matterId ?? h.id),
    dofNoveltyKeys: briefing.emptyToday ? [] : [...briefing.byClient.keys()],
    deadlinesThisWeek,
    reviewsPending: briefing.reviews.length,
    actions,
  })

  const asuntosMetric =
    morning.metrics.find((m) => m.id === 'asuntosConNovedad')?.value ?? 0
  const plazosMetric =
    morning.metrics.find((m) => m.id === 'plazosEstaSemana')?.value ?? 0
  const reviewsMetric =
    morning.metrics.find((m) => m.id === 'pendientesRevision')?.value ?? 0
  const nextDue = soonestDueIso(dueAts)
  const dailyLine = buildHoyDailyLine({
    asuntosMoved: asuntosMetric,
    plazosThisWeek: plazosMetric,
    nextPlazoWeekday: nextDue ? weekdayNameEsFromIso(nextDue) : null,
    reviewsPending: reviewsMetric,
  })

  return (
    <div className="cic-hoy-layout">
      <div className="cic-hoy-primary">
        <SuMananaHero
          metrics={morning.metrics}
          actions={morning.actions}
          deniedNotes={deniedNotes}
          dailyLine={dailyLine}
        />

        {homeKind === 'socio' || homeKind === 'admin' ? (
          <PartnerCoverageMap
            board={bulletins.board.map((r) => ({
              stateCode: r.stateCode,
              stateName: r.stateName,
              status: r.status,
              statusLabel: r.statusLabel,
              hitsExact: r.hitsExact,
              hitsPossible: r.hitsPossible,
            }))}
          />
        ) : null}

        <WeekDeadlineStrip dueAts={dueAts} />

        {homeKind === 'pasante' || homeKind === 'coordinador' ? (
          <PersonaStartPanel kind={homeKind} unavailableIds={[]} />
        ) : null}

        {homeKind === 'pasante' && bulletins.manuals.length > 0 ? (
          <section className="cic-section" aria-labelledby="pasante-manuals">
            <h2 id="pasante-manuals" className="cic-h2">
              {copy.hoy.bulletinsManual}
            </h2>
            <ul className="cic-stack cic-match-list">
              {bulletins.manuals.map((m) => (
                <li key={m.id} className="cic-card" style={{ margin: 0 }}>
                  <strong>{m.stateName}</strong>
                  <p className="cic-muted" style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
                    {m.sourceName}
                  </p>
                  <p style={{ margin: '8px 0 0' }}>
                    <Link href="/ciceron/boletines" className="cic-btn cic-btn-compact">
                      {copy.boletines.revisarManualmente}
                    </Link>
                  </p>
                  <p className="cic-muted cic-inline-denied" role="note">
                    {copy.personaHome.unavailable['confirm-deadline'].reason}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="cic-hoy-links">
          <Link href="/ciceron/hoy/briefing">{copy.engagement.openBriefing}</Link>
          {(persona.role === 'socio' || persona.role === 'admin') && (
            <>
              {' · '}
              <Link href="/ciceron/hoy/resumen-semanal">{copy.engagement.openWeekly}</Link>
              {' · '}
              <Link href="/ciceron/hoy/digest-semanal">{copy.engagement.openDigest}</Link>
              {' · '}
              <Link href="/ciceron/boletines/coordinador">
                {copy.personaHome.socio.primaryLabel}
              </Link>
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

        <section className="cic-section" aria-labelledby="hoy-bulletins">
          <h2 id="hoy-bulletins" className="cic-h2">
            {copy.hoy.bulletinsTitle}
          </h2>
          <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
            {copy.hoy.bulletinsLead}
          </p>
          <p className="cic-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {copy.hoy.bulletinDateLabel}: {formatDateLongEs(bulletins.asOf)}
          </p>
          <p className="cic-muted" style={{ fontSize: '0.8rem' }}>
            {bulletins.source === 'schema'
              ? copy.boletines.dataSourceDb
              : bulletins.source === 'fixture'
                ? copy.boletines.dataSourceFixture
                : copy.boletines.dataSourceError}
            {bulletins.source === 'error' && bulletins.error
              ? ` — ${bulletins.error}`
              : null}
          </p>
          {bulletins.hits.length === 0 ? (
            <p className="cic-muted" role="status">
              {buildEmptyHoyMessage({
                matterCount: Math.max(
                  38,
                  bulletins.board.reduce((n, r) => n + (r.mattersSearched || 0), 0)
                ),
                bulletinsReviewed: bulletins.board.filter((b) => b.status !== 'sin_publicacion')
                  .length,
                consultedAtHm:
                  formatConsultHm(
                    bulletins.board
                      .map((b) => b.runFinishedAt)
                      .find((v): v is string => Boolean(v)) ?? null
                  ) ?? '09:30',
              })}
            </p>
          ) : (
            <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
              {bulletins.hits.slice(0, 5).map((h) => (
                <li key={h.id} style={{ marginBottom: 8 }}>
                  <Link href={h.caseFileId ? `/ciceron/expedientes/${h.caseFileId}` : '/ciceron/boletines'}>
                    <strong>{h.clientName ?? h.stateName}</strong>
                    {' · '}
                    {h.courtName ?? '—'}
                    {' · '}
                    {h.expedienteNumber ?? '—'}
                  </Link>
                  {h.summary ? (
                    <span className="cic-muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                      {h.summary}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {bulletins.manuals.length > 0 ? (
            <p style={{ marginBottom: 8 }}>
              <strong>{copy.hoy.bulletinsManual}:</strong>{' '}
              {bulletins.manuals.map((m) => m.stateName).join(', ')}
            </p>
          ) : null}
          <p style={{ marginTop: 8 }}>
            <Link href="/ciceron/boletines" className="cic-muted" style={{ fontSize: '0.9rem' }}>
              {copy.hoy.bulletinsOpen} →
            </Link>
          </p>
        </section>

        {!briefing.editionIsToday ? (
          <p className="cic-edition-heading" role="status">
            {copy.hoy.dofEditionLabel}: {briefing.editionLabel}
          </p>
        ) : null}

        <section className="cic-section" aria-labelledby="hoy-matches">
          <h2 id="hoy-matches" className="cic-h2">
            {copy.hoy.matches}
          </h2>
          {briefing.emptyToday ? (
            <p className="cic-muted">
              {briefing.source === 'schema' ? copy.hoy.emptyToday : copy.empty.hoyNone}{' '}
              {briefing.source === 'schema' ? (
                <span>
                  ({copy.hoy.reviewedCount}: {briefing.totalClassified})
                </span>
              ) : null}
            </p>
          ) : (
            [...briefing.byClient.entries()].map(([clientName, items]) => (
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
                    subjectArea={n.subjectAreas[0]}
                    date={n.date}
                    officialUrl={n.officialUrl}
                    review={n.review}
                    showReviewBadge={n.hasReviewTask}
                  />
                ))}
              </div>
            ))
          )}
          <p style={{ marginTop: 12 }}>
            <Link href="/ciceron/monitor-dof" className="cic-muted" style={{ fontSize: '0.9rem' }}>
              {copy.rooms['monitor-dof']} →
            </Link>
          </p>
        </section>

        {briefing.unopenedYesterday.length > 0 && !briefing.emptyToday ? (
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
                  <Link href={`/ciceron/revision/${r.id}`} className="cic-muted" style={{ fontSize: '0.85rem' }}>
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
            {upcomingDeadlines.map((d) => (
              <li key={d.id} className="cic-hoy-deadline-row">
                {d.dueAt ? (
                  <DeadlineCountdown dueAt={d.dueAt} dueLabel={d.due} label={d.label} />
                ) : (
                  <DeadlineMarker label={`${d.label} — ${d.due}`} urgency={d.urgency} />
                )}
                <span className="cic-muted" style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                  {d.clientName}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="cic-hoy-secondary" aria-label={copy.hoy.secondaryColumn}>
        <OnboardingChecklist state={onboarding} />

        {engagement.resume ? (
          <details className="cic-section cic-secondary-panel">
            <summary className="cic-secondary-summary">
              <span className="cic-h2" style={{ fontSize: '1rem', margin: 0 }}>
                {copy.engagement.continueTitle}
              </span>
            </summary>
            <p>
              <Link href={engagement.resume.href}>{engagement.resume.label}</Link>
            </p>
          </details>
        ) : null}

        {engagement.savedViews.length > 0 ? (
          <details className="cic-section cic-secondary-panel">
            <summary className="cic-secondary-summary">
              <span className="cic-h2" style={{ fontSize: '1rem', margin: 0 }}>
                {copy.engagement.savedViewsTitle}
              </span>
            </summary>
            <ul style={{ margin: 8, paddingLeft: 18 }}>
              {engagement.savedViews.map((v) => (
                <li key={v.id}>
                  <Link href={v.href}>{v.name}</Link>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {suggestion ? (
          <details className="cic-section cic-secondary-panel" open={false}>
            <summary className="cic-secondary-summary">
              <span className="cic-h2" style={{ fontSize: '1rem', margin: 0 }}>
                {copy.engagement.feedbackSuggestTitle}
              </span>
            </summary>
            <FeedbackSuggest suggestion={suggestion} />
          </details>
        ) : null}

        <details className="cic-section cic-secondary-panel">
          <summary className="cic-secondary-summary">
            <span className="cic-h2" style={{ fontSize: '1rem', margin: 0 }}>
              {copy.m365.demoPathTitle}
            </span>
          </summary>
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
        </details>
      </aside>
    </div>
  )
}
