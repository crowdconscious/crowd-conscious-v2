import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isWeakDofTitle,
  resolveDisplayTitle,
} from '@/lib/ciceron/dof/display-title'

describe('display-title', () => {
  it('treats REF stubs as weak', () => {
    assert.equal(isWeakDofTitle('Aviso REF:581143'), true)
    assert.equal(isWeakDofTitle('SECRETARIA DE HACIENDA - REF:5803338'), true)
    assert.equal(isWeakDofTitle('Nota 5803338'), true)
    assert.equal(isWeakDofTitle(''), true)
  })

  it('keeps real titles', () => {
    assert.equal(
      isWeakDofTitle(
        'Acuerdo por el que se actualiza el Compendio Nacional de Insumos para la Salud'
      ),
      false
    )
  })

  it('resolves from summary when note title is a REF stub', () => {
    const title = resolveDisplayTitle({
      noteTitle: 'Aviso REF:581143',
      summary:
        'Se publica el listado de autoridades incorporadas al modelo de interconexión digital. El aviso surte efectos al día siguiente de su publicación.',
      authority: 'PODER JUDICIAL',
      documentType: 'aviso',
      noteCode: '581143',
    })
    assert.match(title, /autoridades incorporadas/i)
    assert.doesNotMatch(title, /REF:/i)
  })
})
