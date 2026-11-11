import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadClientsRoom } from '@/lib/ciceron/demo/data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { corpusCoverageLine } from '@/lib/ciceron/research/coverage'
import { loadResearchHistory } from './actions'
import { ResearchDesk } from './ResearchDesk'

export default async function InvestigacionPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const { clients } = await loadClientsRoom(persona)
  const matters = clients.flatMap((c) =>
    c.matters.map((m) => ({ id: m.id, title: `${c.name} — ${m.title}` }))
  )
  const history = await loadResearchHistory(null)
  const coverage = corpusCoverageLine('es')

  return (
    <div>
      <h1 className="cic-h1">{copy.investigacion.title}</h1>
      <p className="cic-lead">{copy.investigacion.lead}</p>
      <ResearchDesk coverage={coverage} matters={matters} history={history} />
    </div>
  )
}
