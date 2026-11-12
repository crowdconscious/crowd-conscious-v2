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
})
