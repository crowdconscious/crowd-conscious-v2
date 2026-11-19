import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { DisclosureCard } from '../../../_components/DisclosureCard'
import { MatchActions } from '../../../_components/MatchActions'
import { MatchCollaborationPanel } from '../../../_components/MatchCollaborationPanel'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadMonitorMatches } from '@/lib/ciceron/demo/monitor-data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const { matchId } = await params
  const { items, source } = await loadMonitorMatches(persona, { onlyMine: true })
  const item = items.find((i) => i.matchId === matchId || i.id === matchId)
  if (!item) notFound()

  return (
    <div>
      <p style={{ marginBottom: 16, fontSize: '0.9rem' }}>
        <Link href={`${CICERON_BASE}/monitor-dof`}>{copy.collab.backToMonitor}</Link>
        {' · '}
        <Link href={`${CICERON_BASE}/mis-asignaciones`}>
          {copy.collab.myAssignmentsTitle}
        </Link>
      </p>
      <h1 className="cic-h1">{copy.collab.matchDetailTitle}</h1>
      <p className="cic-lead">{item.title}</p>

      <DisclosureCard
        title={item.title}
        clientName={item.clientName}
        reason={item.reason}
        action={item.action}
        passage={item.passage}
        authority={item.authority}
        type={item.type}
        subjectArea={item.subjectAreas[0]}
        date={item.date}
        officialUrl={item.officialUrl}
        review={item.review}
        showReviewBadge={item.hasReviewTask}
      />

      {source === 'schema' ? <MatchActions matchId={item.matchId} /> : null}
      <MatchCollaborationPanel persona={persona} matchId={item.matchId} />
    </div>
  )
}
