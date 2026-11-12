'use client'

import { useActionState } from 'react'
import { tryAccessAction } from '../../actions'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { formatPolicyCell } from '@/lib/ciceron/audit/policy-labels'

function ResultCard({
  ok,
  policyId,
  policyReason,
  model,
}: {
  ok: boolean
  policyId?: string | null
  policyReason?: string | null
  model?: string | null
}) {
  return (
    <div className={`cic-policy-box ${ok ? 'is-allowed' : 'is-denied'}`}>
      <strong>{ok ? copy.access.allowed : copy.access.denied}</strong>
      {model ? (
        <p className="cic-muted" style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
          {copy.access.model}: {model.toUpperCase()}
        </p>
      ) : null}
      {!ok ? (
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
          <span className="cic-muted">{copy.access.policy}: </span>
          {formatPolicyCell(policyId, policyReason)}
        </p>
      ) : null}
      {!ok && policyId ? (
        <p className="cic-muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
          policy_id: {policyId}
        </p>
      ) : null}
    </div>
  )
}

function ScenarioResults({
  result,
}: {
  result: {
    ok: boolean
    error?: string
    explainer: string
    allowed: {
      ok: boolean
      policyId?: string | null
      policyReason?: string | null
      model?: string | null
    }
    denied: {
      ok: boolean
      policyId?: string | null
      policyReason?: string | null
      model?: string | null
    }
  }
}) {
  if (result.error || result.ok === false) {
    return (
      <div className="cic-policy-box is-denied" role="alert" style={{ marginTop: 12 }}>
        <strong>{copy.access.rpcError}</strong>
        {result.error ? (
          <p className="cic-muted" style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
            {result.error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <ResultCard
        ok={result.allowed.ok}
        policyId={result.allowed.policyId}
        policyReason={result.allowed.policyReason}
        model={result.allowed.model}
      />
      <ResultCard
        ok={result.denied.ok}
        policyId={result.denied.policyId}
        policyReason={result.denied.policyReason}
        model={result.denied.model}
      />
      <p className="cic-muted" style={{ marginTop: 12, fontSize: '0.9rem' }}>
        {result.explainer}
      </p>
    </>
  )
}

export function AccessTryPanel() {
  const [state, action, pending] = useActionState(tryAccessAction, null)

  return (
    <div className="cic-access-grid" style={{ marginTop: 24 }}>
      <section className="cic-section" aria-labelledby="rbac-title">
        <h2 id="rbac-title" className="cic-h2">
          {copy.access.rbacTitle}
        </h2>
        <p>{copy.access.rbacBody}</p>
        <form action={action}>
          <input type="hidden" name="scenario" value="rbac" />
          <button type="submit" className="cic-btn" disabled={pending}>
            {copy.access.tryIt} RBAC
          </button>
        </form>
        {state?.scenario === 'rbac' ? <ScenarioResults result={state.result} /> : null}
      </section>

      <section className="cic-section" aria-labelledby="abac-title">
        <h2 id="abac-title" className="cic-h2">
          {copy.access.abacTitle}
        </h2>
        <p>{copy.access.abacBody}</p>
        <form action={action}>
          <input type="hidden" name="scenario" value="abac" />
          <button type="submit" className="cic-btn" disabled={pending}>
            {copy.access.tryIt} ABAC
          </button>
        </form>
        {state?.scenario === 'abac' ? <ScenarioResults result={state.result} /> : null}
      </section>
    </div>
  )
}
