import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ClientTag } from '../../../_components/ClientTag'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { formatDueLabel, loadReviewInbox, loadReviewTaskDetail } from '@/lib/ciceron/review/data'
import { ReviewWorkspace } from './ReviewWorkspace'

export default async function RevisionTaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const { id } = await params
  const [{ detail }, inbox] = await Promise.all([
    loadReviewTaskDetail(persona, id),
    loadReviewInbox(persona, 'all'),
  ])

  if (!detail) notFound()

  const ids = inbox.items.map((i) => i.id)
  const idx = ids.indexOf(detail.id)
  const neighborIds = {
    prev: idx > 0 ? ids[idx - 1]! : null,
    next: idx >= 0 && idx < ids.length - 1 ? ids[idx + 1]! : null,
  }

  return (
    <div>
      <p className="cic-muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
        <Link href={`${CICERON_BASE}/revision`}>{copy.revision.title}</Link>
        {' / '}
        <ClientTag name={detail.clientName} />
      </p>
      <h1 className="cic-h1" style={{ fontSize: '1.45rem' }}>
        {detail.title}
      </h1>
      <p className="cic-muted" style={{ marginTop: 8 }}>
        {detail.matterTitle} · {copy.revision.due}: {formatDueLabel(detail.dueAt)}
        {detail.overdue ? ` · ${copy.revision.overdue}` : ''}
        {detail.isDemo ? ` · ${copy.demoLabel}` : ''}
      </p>

      <ReviewWorkspace detail={detail} neighborIds={neighborIds} />
    </div>
  )
}
