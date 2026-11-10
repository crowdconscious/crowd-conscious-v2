import { DisclosureCard } from '../../_components/DisclosureCard'
import { DeadlineMarker } from '../../_components/DeadlineMarker'
import { ReviewBadge } from '../../_components/ReviewBadge'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  fixtureDeadlines,
  fixtureDofNotes,
  fixtureReviews,
} from '@/lib/ciceron/demo/fixtures'

export default function HoyPage() {
  return (
    <div>
      <h1 className="cic-h1">{copy.hoy.title}</h1>
      <p className="cic-lead">{copy.hoy.lead}</p>

      <section className="cic-section" aria-labelledby="hoy-matches">
        <h2 id="hoy-matches" className="cic-h2">
          {copy.hoy.matches}
        </h2>
        {fixtureDofNotes.map((n) => (
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
      </section>

      <section className="cic-section" aria-labelledby="hoy-reviews">
        <h2 id="hoy-reviews" className="cic-h2">
          {copy.hoy.reviews}
        </h2>
        <ul className="cic-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {fixtureReviews.map((r) => (
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
            </li>
          ))}
        </ul>
      </section>

      <section className="cic-section" aria-labelledby="hoy-deadlines">
        <h2 id="hoy-deadlines" className="cic-h2">
          {copy.hoy.deadlines}
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="cic-stack">
          {fixtureDeadlines.map((d) => (
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
