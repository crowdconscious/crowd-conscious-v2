'use client'

import { copy } from '@/lib/ciceron/copy/es-MX'
import { switchCiceronPersona } from '../actions'

export type SwitchablePersona = {
  id: string
  role: string
  displayName: string
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
          const label =
            p.role === 'socio'
              ? copy.demoBar.socio
              : p.role === 'pasante'
                ? copy.demoBar.pasante
                : p.role === 'admin'
                  ? copy.roleAdmin
                  : copy.demoBar.asociado
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
