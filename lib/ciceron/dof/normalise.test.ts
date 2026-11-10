import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { normaliseDofHtml } from './normalise'
import { chunkDofText, estimateTokens } from './chunk'

const FIXTURE_DIR = join(process.cwd(), 'docs/ciceron/fixtures/sidof')

type NotaFixture = {
  Nota?: {
    codNota?: string | number
    titulo?: string
    cadenaContenido?: string
  }
}

function loadNotes() {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.startsWith('nota-') && f.endsWith('.json'))
    .map((f) => {
      const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, f), 'utf8')) as NotaFixture
      const nota = raw.Nota
      assert.ok(nota?.cadenaContenido, `fixture ${f} missing body`)
      return {
        file: f,
        code: String(nota!.codNota),
        title: nota!.titulo ?? f,
        html: nota!.cadenaContenido!,
      }
    })
}

describe('ciceron DOF normalise + chunk (fixtures)', () => {
  const notes = loadNotes()

  it('loads at least five real note fixtures including long and short', () => {
    assert.ok(notes.length >= 5, `expected >=5 fixtures, got ${notes.length}`)
    const lengths = notes.map((n) => n.html.length).sort((a, b) => a - b)
    assert.ok(lengths[0]! < 20_000, 'expected a short notice fixture')
    assert.ok(lengths[lengths.length - 1]! > 100_000, 'expected a long decree/acuerdo fixture')
  })

  for (const note of notes) {
    it(`normalises and chunks ${note.file}`, () => {
      const { text, title } = normaliseDofHtml(note.html, note.title)
      assert.ok(text.length > 40, 'normalised text too short')
      assert.ok(title.length > 3)
      assert.doesNotMatch(text, /<html|<script/i)

      const chunks = chunkDofText(note.code, text, title)
      assert.ok(chunks.length >= 1)
      const ids = new Set(chunks.map((c) => c.canonicalCitationId))
      assert.equal(ids.size, chunks.length, 'citation ids must be unique')
      for (const c of chunks) {
        assert.match(c.canonicalCitationId, new RegExp(`^dof:${note.code}:`))
        assert.ok(c.text.length > 0)
        assert.ok(c.position >= 0)
      }
      // structure-first should surface artículos or considerandos on longer notes
      if (text.length > 5000) {
        const joined = chunks.map((c) => c.sectionLabel).join(' ')
        assert.match(joined, /art[ií]culo|considerando|transitor|preambulo|cuerpo/i)
      }
      assert.ok(estimateTokens(text) > 10)
    })
  }

  it('idempotent chunking: same input yields identical citation ids', () => {
    const note = notes.find((n) => n.file.includes('5769997')) ?? notes[0]!
    const { text, title } = normaliseDofHtml(note.html, note.title)
    const a = chunkDofText(note.code, text, title)
    const b = chunkDofText(note.code, text, title)
    assert.deepEqual(
      a.map((c) => c.canonicalCitationId),
      b.map((c) => c.canonicalCitationId)
    )
    assert.deepEqual(
      a.map((c) => c.text),
      b.map((c) => c.text)
    )
  })
})
