import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadClientsRoom } from '@/lib/ciceron/demo/data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { loadFirmBudgetStatus, budgetStatusFromSpend } from '@/lib/ciceron/gateway/budget'
import { loadCorpusCoverageLine } from '@/lib/ciceron/research/coverage'
import { suggestedQuestionsForDesk } from '@/lib/ciceron/research/suggested-questions'
import { loadResearchHistory } from './actions'
import { ResearchDesk } from './ResearchDesk'

export default async function InvestigacionPage({
  searchParams,
}: {
  searchParams?: Promise<{ demoBudget?: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const sp = searchParams ? await searchParams : {}
  const budget =
    sp.demoBudget === 'pause'
      ? budgetStatusFromSpend(50, 50)
      : await loadFirmBudgetStatus(persona.firmId)

  const { clients } = await loadClientsRoom(persona)
  const matters = clients.flatMap((c) =>
    c.matters.map((m) => ({ id: m.id, title: `${c.name} — ${m.title}` }))
  )
  const history = await loadResearchHistory(null)
  const [coverage, suggestedQuestions] = await Promise.all([
    loadCorpusCoverageLine('es'),
    Promise.resolve(suggestedQuestionsForDesk()),
  ])

  return (
    <div>
      <h1 className="cic-h1">{copy.investigacion.title}</h1>
      <p className="cic-lead">{copy.investigacion.lead}</p>
      {budget.researchPaused ? (
        <section className="cic-section cic-budget-paused" aria-labelledby="inv-budget">
          <h2 id="inv-budget" className="cic-h2">
            {copy.engagement.budgetPausedTitle}
          </h2>
          <p>{copy.engagement.budgetPausedBody}</p>
          {budget.alertMessage ? (
            <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
              {budget.alertMessage}
            </p>
          ) : null}
        </section>
      ) : (
        <ResearchDesk
          coverage={coverage}
          matters={matters}
          history={history}
          suggestedQuestions={suggestedQuestions}
        />
      )}
    </div>
  )
}
