import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GUIDED_STORY_STEPS, guidedStepHref } from './guided-story-pure'
import { copy } from '@/lib/ciceron/copy/es-MX'

describe('Prompt 9 guided story', () => {
  it('has exactly six steps plus finale copy', () => {
    assert.equal(GUIDED_STORY_STEPS.length, 6)
    assert.ok(copy.guidedStory.steps[1].title)
    assert.ok(copy.guidedStory.steps[6].title)
    assert.ok(copy.guidedStory.finale.cta)
    assert.match(copy.guidedStory.finale.ctaHref, /^mailto:/)
  })

  it('maps steps to rooms under /ciceron', () => {
    for (const step of GUIDED_STORY_STEPS) {
      assert.match(guidedStepHref(step), /^\/ciceron\//)
    }
    assert.equal(guidedStepHref(7), '/ciceron/hoy')
  })

  it('leads with Hoy/Boletines then coordinador, revisión, expedientes', () => {
    assert.equal(guidedStepHref(1), '/ciceron/hoy')
    assert.equal(guidedStepHref(2), '/ciceron/boletines/coordinador')
    assert.equal(guidedStepHref(3), '/ciceron/revision')
    assert.equal(guidedStepHref(4), '/ciceron/expedientes')
    assert.equal(guidedStepHref(5), '/ciceron/investigacion')
    assert.equal(guidedStepHref(6), '/ciceron/fuentes-cobertura')
    assert.match(copy.guidedStory.steps[1].title, /boletines estatales/i)
    assert.match(copy.guidedStory.steps[1].body, /Diario Oficial/i)
    assert.match(copy.guidedStory.steps[1].body, /deshabilitado/i)
    assert.match(copy.guidedStory.steps[2].title, /09:30|manuales/i)
    assert.equal(copy.guidedStory.demoTag, 'Datos de demostración')
  })
})
