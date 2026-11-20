'use client'

import { useActionState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  sendDemoMorningTestAction,
  sendDemoMorningWhatsAppTestAction,
  type DemoTestActionState,
} from '@/lib/ciceron/engagement/morning-email-actions'

function Result({ state }: { state: DemoTestActionState }) {
  if (!state) return null
  return (
    <p
      role={state.ok ? 'status' : 'alert'}
      className={state.ok ? 'cic-muted' : undefined}
      style={{
        marginTop: 8,
        fontSize: '0.9rem',
        color: state.ok ? undefined : 'var(--cic-danger, #8B1E1E)',
      }}
    >
      {state.message}
    </p>
  )
}

export function DemoEmailTestForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(
    sendDemoMorningTestAction,
    null
  )
  return (
    <form action={action} style={{ marginTop: 24 }}>
      <button
        type="submit"
        className="cic-btn"
        disabled={disabled || pending}
      >
        {pending ? copy.morningEmail.testSendPending : copy.morningEmail.sendDemoTest}
      </button>
      <p className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
        {copy.morningEmail.sendDemoTestNote}
      </p>
      <Result state={state} />
    </form>
  )
}

export function DemoWhatsAppTestForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(
    sendDemoMorningWhatsAppTestAction,
    null
  )
  return (
    <form action={action} style={{ marginTop: 16 }}>
      <button type="submit" className="cic-btn" disabled={disabled || pending}>
        {pending ? copy.whatsapp.testSendPending : copy.whatsapp.sendDemoTest}
      </button>
      <p className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
        {copy.whatsapp.sendDemoTestNote}
      </p>
      <Result state={state} />
    </form>
  )
}
