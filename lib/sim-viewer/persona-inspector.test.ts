import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PERSONA_GROUNDING_LINE,
  alcaldiaGlyph,
  nseBandColor,
} from './persona-mark.ts'
import type { PersonaGrounding } from '../../types/simulation.ts'

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

describe('PersonaGrounding contract', () => {
  it('accepts the shared Task 5 shape with isExample', () => {
    const g: PersonaGrounding = {
      isExample: true,
      sources: [
        {
          name: 'INEGI Censo de Población y Vivienda',
          year: 2020,
          url: 'https://www.inegi.org.mx/programas/ccpv/2020/',
          table: 'AGEB urbana',
        },
      ],
      ageb: {
        code: '091000',
        population: 3200,
        marginals: [
          { label: 'Grupo de edad 18–29', value: '22%', share: 0.22 },
          { label: 'Tamaño medio del hogar', value: '3.1 pers.' },
        ],
      },
      method: 'Muestreo de celda demográfica a partir de marginales del AGEB.',
    }
    assert.equal(g.isExample, true)
    assert.equal(g.sources.length, 1)
    assert.equal(g.ageb.marginals.length, 2)
  })
})
