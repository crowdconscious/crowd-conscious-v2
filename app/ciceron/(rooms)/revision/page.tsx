import { redirect } from 'next/navigation'
import { ReviewBadge } from '../../_components/ReviewBadge'
import { ClientTag } from '../../_components/ClientTag'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadReviews } from '@/lib/ciceron/demo/data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export default async function RevisionPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const { reviews } = await loadReviews(persona)

  return (
    <div>
      <h1 className="cic-h1">{copy.revision.title}</h1>
      <p className="cic-lead">{copy.revision.lead}</p>

      <section className="cic-section cic-stack">
        {reviews.map((r) => (
          <article key={r.id} className="cic-card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h2 className="cic-h2" style={{ fontSize: '1.05rem' }}>
                  {r.title}
                </h2>
                <p className="cic-muted" style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
                  <ClientTag name={r.clientName} />
                </p>
                <p className="cic-muted" style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
                  {copy.revision.due}: {r.due} · {copy.revision.assignee}: {r.assignee}
                </p>
              </div>
              <ReviewBadge state={r.state} />
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
