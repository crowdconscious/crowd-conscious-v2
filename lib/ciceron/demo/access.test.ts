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

  it('317 seeds only public demo hashes with pepper_version and no pepper plaintext', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/317_ciceron_demo_invites.sql'),
      'utf8'
    )
    assert.match(sql, /pepper_version/)
    assert.match(sql, /3e88bb2a453f689e314810c301bbf790a09d5ee1afb4e0e0147dd0727c2b7f78/)
    assert.match(sql, /b68b3f391c07312e458cb97345b4dd4e180f77cc823f069f5c17a4acbe70938e/)
    assert.doesNotMatch(sql, /ciceron-demo-pepper/)
    assert.doesNotMatch(sql, /DESPACHO-ADMIN/)
    assert.doesNotMatch(sql, /CICERON_INVITE_PEPPER\s*=/)
  })

  it('318 uses ABAC persona id and non-redeemable invite placeholder', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/318_ciceron_demo_access.sql'),
      'utf8'
    )
    assert.match(sql, /e3000000-0000-4000-8000-000000000010/)
    assert.match(sql, /nr-e3000000000000000000000000000010/)
    assert.doesNotMatch(sql, /DESPACHO-ABAC/)
    assert.doesNotMatch(sql, /display_name LIKE/)
    assert.match(sql, /p_simulated_by/)
    assert.match(sql, /RPC-enforced|evaluate_access RPC/)
  })

  it('319 reset is admin-only and expires sessions', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/319_ciceron_demo_ops.sql'),
      'utf8'
    )
    assert.match(sql, /never a Vercel cron/i)
    assert.match(sql, /refresh_demo_dates/)
    assert.match(sql, /reset_demo_firm/)
    assert.match(sql, /actor_role <> 'admin'/)
    assert.match(sql, /SET expires_at = now\(\)/)
    assert.doesNotMatch(sql, /DELETE FROM ciceron\.demo_sessions/)
  })
})
