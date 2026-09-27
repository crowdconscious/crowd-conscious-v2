import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PERSONA_GROUNDING_LINE,
  alcaldiaGlyph,
  nseBandColor,
} from './persona-mark.ts'

describe('persona inspector grounding', () => {
  it('exports the verbatim Prompt Pack grounding line', () => {
    assert.equal(
      PERSONA_GROUNDING_LINE,
      'Persona sintetica generada a partir de marginales del Censo INEGI 2020 a nivel AGEB. No representa a una persona real.'
    )
  })
})

describe('persona abstract mark keys', () => {
  it('maps NSE bands to distinct colours', () => {
    const bands = ['A/B', 'C+', 'C', 'C-', 'D+', 'D']
    const colours = bands.map(nseBandColor)
    assert.equal(new Set(colours).size, bands.length)
  })

  it('keys glyph geometry to alcaldía', () => {
    assert.equal(alcaldiaGlyph('Miguel Hidalgo'), 'diamond')
    assert.equal(alcaldiaGlyph('Cuauhtémoc'), 'hexagon')
    assert.equal(alcaldiaGlyph('Benito Juárez'), 'square')
  })
})
