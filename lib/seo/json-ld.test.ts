import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from './json-ld'

describe('site JSON-LD builders', () => {
  it('Organization includes address and contactPoint without a phone', () => {
    const org = buildOrganizationJsonLd()
    assert.equal(org['@type'], 'Organization')
    const address = org.address as Record<string, unknown>
    assert.equal(address['@type'], 'PostalAddress')
    assert.equal(address.streetAddress, 'Hegel 406, Polanco')
    assert.equal(address.postalCode, '11560')
    const points = org.contactPoint as Array<Record<string, unknown>>
    assert.equal(points[0]?.email, 'comunidad@crowdconscious.app')
    assert.equal(typeof points[0]?.telephone, 'undefined')
    assert.match(String(points[0]?.url), /\/contact$/)
  })

  it('WebSite has no SearchAction', () => {
    const site = buildWebSiteJsonLd()
    assert.equal(site['@type'], 'WebSite')
    assert.equal(typeof site.potentialAction, 'undefined')
  })
})
