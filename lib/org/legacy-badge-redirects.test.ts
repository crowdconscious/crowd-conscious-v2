import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { LEGACY_BADGE_REDIRECTS } from './legacy-badge-redirects.ts'

test('old PR #60 badge URLs redirect to files that exist', () => {
  const sources = LEGACY_BADGE_REDIRECTS.map((r) => r.source)
  assert.ok(sources.includes('/sello/sello-empresa-consciente.svg'))
  assert.ok(sources.includes('/sello/sello-esfuerzo-consciente-1024.png'))
  for (const r of LEGACY_BADGE_REDIRECTS) {
    assert.ok(existsSync(join(process.cwd(), 'public', r.destination)), `missing ${r.destination}`)
    assert.ok(!existsSync(join(process.cwd(), 'public', r.source)), `source still a real file: ${r.source}`)
  }
})
