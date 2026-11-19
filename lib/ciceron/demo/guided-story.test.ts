import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  GUIDED_STORY_STEPS,
  GUIDED_STORY_TOTAL,
  guidedStepHref,
  normalizeGuidedStep,
} from './guided-story-pure'
import { copy } from '@/lib/ciceron/copy/es-MX'

describe('Guided story — five-step Nexora thread', () => {
  it('has exactly five steps plus finale copy', () => {
    assert.equal(GUIDED_STORY_STEPS.length, 5)
    assert.equal(GUIDED_STORY_TOTAL, 5)
    assert.ok(copy.guidedStory.steps[1].title)
    assert.ok(copy.guidedStory.steps[5].title)
    assert.equal(
      // @ts-expect-error step 6 removed from steps object
      copy.guidedStory.steps[6],
      undefined
    )
    assert.ok(copy.guidedStory.finale.cta)
    assert.match(copy.guidedStory.finale.ctaHref, /^mailto:/)
    assert.equal(copy.guidedStory.start, 'Recorrido guiado')
  })

  it('maps steps to rooms under /ciceron along one client story', () => {
    for (const step of GUIDED_STORY_STEPS) {
      assert.match(guidedStepHref(step), /^\/ciceron\//)
    }
    assert.equal(guidedStepHref(1), '/ciceron/boletines')
    assert.equal(guidedStepHref(2), '/ciceron/boletines')
    assert.equal(guidedStepHref(3), '/ciceron/expedientes/case-1')
    assert.equal(guidedStepHref(4), '/ciceron/revision')
    assert.equal(guidedStepHref(5), '/ciceron/boletines/coordinador')
    assert.equal(guidedStepHref(6), '/ciceron/hoy')
  })

  it('keeps a single fictional client in copy', () => {
    assert.match(copy.guidedStory.storyClient, /Nexora Pagos/)
    assert.match(copy.guidedStory.steps[1].body, /Nexora Pagos/)
    assert.match(copy.guidedStory.steps[2].body, /Nexora Pagos/)
    assert.match(copy.guidedStory.steps[5].title, /socios/i)
    assert.equal(copy.guidedStory.demoTag, 'Datos de demostración')
  })

  it('normalizes legacy 6/7 steps into the five-step tour', () => {
    assert.equal(normalizeGuidedStep(7), 6)
    assert.equal(normalizeGuidedStep(6), 6)
    assert.equal(normalizeGuidedStep(3), 3)
    assert.equal(normalizeGuidedStep(0), 1)
  })
})
