import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('ciceron PWA manifest', () => {
  it('scopes to /ciceron and starts on Hoy', () => {
    const raw = readFileSync('public/ciceron/manifest.webmanifest', 'utf8')
    const manifest = JSON.parse(raw) as {
      name: string
      start_url: string
      scope: string
      display: string
      icons: Array<{ src: string }>
    }
    assert.equal(manifest.name, 'Cicerón.ai')
    assert.equal(manifest.start_url, '/ciceron/hoy')
    assert.equal(manifest.scope, '/ciceron/')
    assert.equal(manifest.display, 'standalone')
    assert.ok(manifest.icons.some((i) => i.src.includes('icon-192')))
    assert.ok(manifest.icons.some((i) => i.src.includes('icon-512')))
    assert.match(raw, /Equipo de Cicerón/)
  })
})
