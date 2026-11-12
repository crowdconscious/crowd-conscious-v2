import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isProspectDemoSession,
  shouldShowAdminRailLinks,
} from './rail-visibility'

describe('ciceron rail visibility', () => {
  it('hides admin links for non-admin roles', () => {
    assert.equal(isProspectDemoSession({ role: 'socio' }), true)
    assert.equal(isProspectDemoSession({ role: 'asociado' }), true)
    assert.equal(isProspectDemoSession({ role: 'pasante' }), true)
    assert.equal(
      shouldShowAdminRailLinks({ roleKey: 'socio', isProspectSession: true }),
      false
    )
  })

  it('hides admin links for admin role when invite is not an admin mint', () => {
    assert.equal(
      isProspectDemoSession({ role: 'admin', inviteMintedForAdmin: false }),
      true
    )
    assert.equal(
      shouldShowAdminRailLinks({
        roleKey: 'admin',
        isProspectSession: true,
      }),
      false
    )
  })

  it('shows admin links only for admin role on admin-mint invite', () => {
    assert.equal(
      isProspectDemoSession({ role: 'admin', inviteMintedForAdmin: true }),
      false
    )
    assert.equal(
      shouldShowAdminRailLinks({
        roleKey: 'admin',
        isProspectSession: false,
      }),
      true
    )
  })

  it('treats unknown invite mint as non-prospect when role is admin', () => {
    // Layouts pass inviteMintedForAdmin when known; admin role without a
    // prospect flag still shows links (ops cookie path).
    assert.equal(isProspectDemoSession({ role: 'admin' }), false)
    assert.equal(
      isProspectDemoSession({ role: 'admin', inviteMintedForAdmin: null }),
      false
    )
  })
})
