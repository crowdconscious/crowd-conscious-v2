import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { offlineTryAccess, ACCESS_SHOWCASE } from './access-pure'
import { formatPolicyCell, policyLabelEs } from '@/lib/ciceron/audit/policy-labels'
import { CICERON_P9_SEED } from './seed-ids'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Prompt 9 access showcase', () => {
  it('offline RBAC try shows role denial with Spanish rule', () => {
    const res = offlineTryAccess('rbac')
    assert.equal(res.allowed.ok, true)
    assert.equal(res.denied.ok, false)
    assert.equal(res.denied.policyId, 'rbac_role')
    assert.match(String(res.denied.policyReason), /RBAC/)
    assert.match(formatPolicyCell(res.denied.policyId, res.denied.policyReason), /RBAC/)
  })

  it('offline ABAC try shows conflict wall', () => {
    const res = offlineTryAccess('abac')
    assert.equal(res.denied.ok, false)
    assert.equal(res.denied.policyId, 'abac_conflict_wall')
    assert.equal(policyLabelEs('abac_conflict_wall'), 'ABAC — muro de conflicto')
  })

  it('seed ids use e3 prefix and valid hex', () => {
    assert.match(CICERON_P9_SEED.personas.abacAsociado, /^e3[0-9a-f-]{34}$/)
    assert.equal(ACCESS_SHOWCASE.abacPersonaId, CICERON_P9_SEED.personas.abacAsociado)
  })

  it('hardening migration revokes set_actor from authenticated', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/320_ciceron_hardening_prompt9.sql'),
      'utf8'
    )
    assert.match(
      sql,
      /REVOKE EXECUTE ON FUNCTION ciceron\.set_actor\(uuid\) FROM PUBLIC, anon, authenticated/
    )
    assert.match(sql, /firm_onboarding_insert/)
    assert.match(sql, /DROP POLICY IF EXISTS firm_onboarding_write/)
  })

  it('317 seeds DESPACHO-DEMO and DESPACHO-PASANTE hashes', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/317_ciceron_demo_invites.sql'),
      'utf8'
    )
    assert.match(sql, /3e88bb2a453f689e314810c301bbf790a09d5ee1afb4e0e0147dd0727c2b7f78/)
    assert.match(sql, /b68b3f391c07312e458cb97345b4dd4e180f77cc823f069f5c17a4acbe70938e/)
  })

  it('319 freshness is lazy without Vercel cron', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/319_ciceron_demo_ops.sql'),
      'utf8'
    )
    assert.match(sql, /never a Vercel cron/i)
    assert.match(sql, /refresh_demo_dates/)
    assert.match(sql, /reset_demo_firm/)
  })
})
