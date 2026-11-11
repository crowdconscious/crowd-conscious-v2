import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCitationIndex,
  formatAnswerForCopy,
  orderSourcesByCitations,
  parseAnswerBlocks,
} from './format-answer'

const A = 'd506f9f4-1643-4fd8-b34a-0220636a5500'
const B = '3bbe4df1-c76a-4c7b-acae-e15228f0c9dd'
const C = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

describe('ciceron format-answer', () => {
  it('deduplicates chunk markers into stable numbers by first appearance', () => {
    const body = `Hecho uno [chunk:${A}]. Hecho dos [chunk:${B}] y otra vez [chunk:${A}].`
    const index = buildCitationIndex(body, [{ chunkId: C }, { chunkId: A }, { chunkId: B }])
    assert.equal(index.numberById.get(A), 1)
    assert.equal(index.numberById.get(B), 2)
    assert.equal(index.numberById.get(C), 3)
    assert.deepEqual(index.orderedIds, [A, B, C])
  })

  it('parses bold headings and citation chips without HTML', () => {
    const body = [
      '**Conclusión breve:**',
      '',
      `El acuerdo establece un plazo. [chunk:${A}][chunk:${B}]`,
      '',
      '**Lo que dicen las fuentes**',
      '',
      `Detalle adicional [chunk:${A}].`,
    ].join('\n')
    const index = buildCitationIndex(body)
    const blocks = parseAnswerBlocks(body, index)
    assert.equal(blocks[0]?.kind, 'heading')
    if (blocks[0]?.kind === 'heading') {
      assert.equal(blocks[0].text, 'Conclusión breve')
    }
    assert.equal(blocks[1]?.kind, 'paragraph')
    if (blocks[1]?.kind === 'paragraph') {
      const cites = blocks[1].children.filter((c) => c.kind === 'cite')
      assert.equal(cites.length, 2)
      assert.deepEqual(
        cites.map((c) => (c.kind === 'cite' ? c.n : null)),
        [1, 2]
      )
    }
    assert.equal(blocks[2]?.kind, 'heading')
    if (blocks[2]?.kind === 'heading') {
      assert.match(blocks[2].text, /fuentes/i)
    }
  })

  it('formats copy text with numbered citations and source list (no uuids)', () => {
    const body = `**Conclusión breve:** Hecho [chunk:${A}] y [chunk:${B}] y [chunk:${A}].`
    const sources = [
      {
        chunkId: A,
        authority: 'IMSS',
        title: 'Acuerdo',
        noteDate: '2026-11-10',
        officialUrl: 'https://www.dof.gob.mx/a',
        passage: 'pasaje a',
      },
      {
        chunkId: B,
        authority: 'CNBV',
        title: null,
        noteDate: '2026-11-09',
        officialUrl: null,
        passage: 'pasaje b',
      },
    ]
    const copy = formatAnswerForCopy(body, sources)
    assert.equal(copy.includes(A), false)
    assert.equal(copy.includes('chunk:'), false)
    assert.match(copy, /\[1\].*\[2\]/)
    assert.match(copy, /Fuentes/)
    assert.match(copy, /\[1\] IMSS/)
    assert.match(copy, /\[2\] CNBV/)
    assert.match(copy, /Conclusión breve/)
  })

  it('orders evidence cards to match citation numbers', () => {
    const body = `Primero [chunk:${B}] luego [chunk:${A}].`
    const sources = [
      { chunkId: A, label: 'a' },
      { chunkId: B, label: 'b' },
    ]
    const index = buildCitationIndex(body, sources)
    const ordered = orderSourcesByCitations(sources, index)
    assert.deepEqual(
      ordered.map((s) => s.chunkId),
      [B, A]
    )
  })

  it('handles ### headings and space-joined section labels without leftover markers', () => {
    const body = `**Conclusión breve:** Resumen con cita [chunk:${A}]. ### Lo que dicen las fuentes Detalle [chunk:${A}].`
    const index = buildCitationIndex(body)
    const blocks = parseAnswerBlocks(body, index)
    const headings = blocks.filter((b) => b.kind === 'heading')
    assert.ok(headings.some((h) => h.kind === 'heading' && /conclusión breve/i.test(h.text)))
    assert.ok(headings.some((h) => h.kind === 'heading' && /fuentes/i.test(h.text)))
    const flat = JSON.stringify(blocks)
    assert.equal(flat.includes('**'), false)
    assert.equal(flat.includes('###'), false)
    assert.equal(flat.includes('chunk:'), false)
  })
})
