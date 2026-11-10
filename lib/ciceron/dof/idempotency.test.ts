import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { normaliseDofHtml } from './normalise'
import { chunkDofText } from './chunk'
import { sha256Hex } from './hash'

/**
 * Pure idempotency contract: same SIDOF payload → same content hash and chunk
 * set. DB-level "run the same day twice" relies on content_hash short-circuit
 * + never downgrading ingest_status in upsertListedNotes.
 */
describe('ciceron DOF idempotency', () => {
  const fixture = join(
    process.cwd(),
    'docs/ciceron/fixtures/sidof/nota-5769997.json'
  )

  it('content hash is stable across two reads of the same day payload', () => {
    const a = readFileSync(fixture)
    const b = readFileSync(fixture)
    assert.equal(sha256Hex(a), sha256Hex(b))
  })

  it('running normalise+chunk twice yields no duplicate citations', () => {
    const raw = JSON.parse(readFileSync(fixture, 'utf8')) as {
      Nota: { codNota: number; titulo: string; cadenaContenido: string }
    }
    const pass = () => {
      const { text, title } = normaliseDofHtml(
        raw.Nota.cadenaContenido,
        raw.Nota.titulo
      )
      return chunkDofText(String(raw.Nota.codNota), text, title)
    }
    const first = pass()
    const second = pass()
    assert.equal(first.length, second.length)
    const merged = [...first, ...second].map((c) => c.canonicalCitationId)
    assert.equal(new Set(merged).size, first.length)
  })

  it('day list fixture has unique codNota values (no duplicates in source)', () => {
    const list = JSON.parse(
      readFileSync(
        join(process.cwd(), 'docs/ciceron/fixtures/sidof/list-10-11-2026.json'),
        'utf8'
      )
    ) as {
      NotasMatutinas: { codNota: number }[]
      NotasVespertinas: { codNota: number }[]
      NotasExtraordinarias: { codNota: number }[]
    }
    const codes = [
      ...list.NotasMatutinas,
      ...list.NotasVespertinas,
      ...list.NotasExtraordinarias,
    ].map((n) => String(n.codNota))
    assert.equal(new Set(codes).size, codes.length)
    assert.ok(codes.length > 50)
  })
})
