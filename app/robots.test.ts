import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import robots from './robots'

describe('robots()', () => {
  it('keeps ciceron + observatorio disallowed and adds auth paths', () => {
    const body = robots()
    const rules = Array.isArray(body.rules) ? body.rules : [body.rules]
    assert.ok(rules.length >= 2)
    for (const rule of rules) {
      const disallow = rule.disallow ?? []
      const list = Array.isArray(disallow) ? disallow : [disallow]
      assert.ok(list.includes('/ciceron'))
      assert.ok(list.includes('/observatorio-rentas'))
      assert.ok(list.includes('/auth/'))
      assert.ok(list.includes('/login'))
      assert.ok(list.includes('/forgot-password'))
      assert.ok(list.includes('/reset-password'))
    }
  })

  it('points Sitemap at SITE_URL', () => {
    const body = robots()
    assert.match(String(body.sitemap), /\/sitemap\.xml$/)
  })
})
