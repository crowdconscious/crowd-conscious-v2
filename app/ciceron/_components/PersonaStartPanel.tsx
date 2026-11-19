import Link from 'next/link'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type {
  PersonaHomeKind,
  UnavailableActionId,
} from '@/lib/ciceron/demo/persona-home-pure'

export function PersonaStartPanel({
  kind,
  unavailableIds,
}: {
  kind: PersonaHomeKind
  unavailableIds: UnavailableActionId[]
}) {
  const panel = copy.personaHome[kind]
  return (
    <section className="cic-persona-start" aria-labelledby="persona-start-title">
      <p className="cic-persona-start-kicker">{copy.personaHome.kicker}</p>
      <h2 id="persona-start-title" className="cic-h2">
        {panel.title}
      </h2>
      <p className="cic-muted cic-persona-start-lead">{panel.lead}</p>
      {panel.primaryHref ? (
        <p className="cic-persona-start-cta">
          <Link className="cic-btn cic-btn-compact" href={panel.primaryHref}>
            {panel.primaryLabel}
          </Link>
        </p>
      ) : null}
      {unavailableIds.length > 0 ? (
        <div
          className="cic-persona-unavailable"
          role="region"
          aria-label={copy.personaHome.unavailableTitle}
        >
          <h3 className="cic-persona-unavailable-title">
            {copy.personaHome.unavailableTitle}
          </h3>
          <ul className="cic-persona-unavailable-list">
            {unavailableIds.map((id) => {
              const item = copy.personaHome.unavailable[id]
              return (
                <li key={id}>
                  <strong>{item.title}</strong>
                  <span className="cic-muted">{item.reason}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
