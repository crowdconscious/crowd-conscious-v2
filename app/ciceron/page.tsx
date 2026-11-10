'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CICERON_DEMO_COOKIE,
  CICERON_DEMO_INVITE_CODE,
} from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import './_components/ciceron.css'

export default function CiceronInvitePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.trim().toUpperCase() !== CICERON_DEMO_INVITE_CODE) {
      setError(true)
      return
    }
    document.cookie = `${CICERON_DEMO_COOKIE}=1; Path=/ciceron; Max-Age=86400; SameSite=Lax`
    router.push('/ciceron/hoy')
  }

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
          <form onSubmit={onSubmit}>
            <label htmlFor="ciceron-invite-code">{copy.invite.codeLabel}</label>
            <input
              id="ciceron-invite-code"
              className="cic-input"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError(false)
              }}
              placeholder={copy.invite.codePlaceholder}
              autoComplete="off"
              spellCheck={false}
            />
            {error ? <p className="cic-error">{copy.invite.error}</p> : null}
            <button type="submit" className="cic-btn">
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
