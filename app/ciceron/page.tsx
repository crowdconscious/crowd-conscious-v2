'use client'

import { useActionState } from 'react'
import { redeemCiceronInvite } from './actions'
import { copy } from '@/lib/ciceron/copy/es-MX'
import './_components/ciceron.css'

export default function CiceronInvitePage() {
  const [state, action, pending] = useActionState(redeemCiceronInvite, null)

  return (
    <div className="ciceron-root" lang="es">
      <div className="cic-demo-banner" role="note">
        {copy.demoLabel}
      </div>
      <div className="cic-invite">
        <div className="cic-invite-panel">
          <h1>{copy.invite.title}</h1>
          <p className="cic-lead" style={{ marginTop: 0 }}>
            {copy.invite.subtitle}
          </p>
          <form action={action}>
            <label htmlFor="ciceron-invite-code">{copy.invite.codeLabel}</label>
            <input
              id="ciceron-invite-code"
              name="code"
              className="cic-input"
              placeholder={copy.invite.codePlaceholder}
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
            />
            {state && !state.ok ? <p className="cic-error">{copy.invite.error}</p> : null}
            <button type="submit" className="cic-btn" disabled={pending}>
              {copy.invite.submit}
            </button>
          </form>
          <p className="cic-muted" style={{ marginTop: 24, fontSize: '0.85rem' }}>
            {copy.invite.note}
          </p>
        </div>
      </div>
    </div>
  )
}
