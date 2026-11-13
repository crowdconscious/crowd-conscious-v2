'use client'

import { copy } from '@/lib/ciceron/copy/es-MX'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { switchCiceronPersona } from '../actions'

export type SwitchablePersona = {
  id: string
  role: string
  displayName: string
}

function personaBarLabel(p: SwitchablePersona): string {
  if (p.id === CICERON_SEED.personas.coordinador) return copy.roleCoordinador
  if (p.role === 'socio') return copy.demoBar.socio
  if (p.role === 'pasante') return copy.demoBar.pasante
  if (p.role === 'admin') return copy.roleAdmin
  return copy.demoBar.asociado
}

export function PersonaSwitcher({
  currentPersonaId,
  personas,
}: {
  currentPersonaId: string
  personas: SwitchablePersona[]
}) {
  return (
    <div className="cic-persona-bar" role="group" aria-label={copy.demoBar.switchLabel}>
      <span className="cic-persona-bar-label">{copy.demoBar.persona}</span>
      <div className="cic-persona-bar-actions">
        {personas.map((p) => {
          const label = personaBarLabel(p)
          const active = p.id === currentPersonaId
          return (
            <form key={p.id} action={switchCiceronPersona}>
              <input type="hidden" name="personaId" value={p.id} />
              <button
                type="submit"
                className={active ? 'cic-persona-btn is-active' : 'cic-persona-btn'}
                aria-pressed={active}
                title={p.displayName}
              >
                {label}
              </button>
            </form>
          )
        })}
      </div>
      <span className="cic-persona-bar-hint cic-muted">{copy.demoBar.hint}</span>
    </div>
  )
}
