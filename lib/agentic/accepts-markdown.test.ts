import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { prefersMarkdown } from './accepts-markdown'

describe('prefersMarkdown', () => {
  it('returns false for missing or empty Accept', () => {
    assert.equal(prefersMarkdown(null), false)
    assert.equal(prefersMarkdown(undefined), false)
    assert.equal(prefersMarkdown(''), false)
  })

  it('returns true for Accept: text/markdown', () => {
    assert.equal(prefersMarkdown('text/markdown'), true)
  })

  it('returns false for typical browser Accept', () => {
    assert.equal(
      prefersMarkdown(
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      ),
      false
    )
  })

  it('returns false when */* is present without text/markdown', () => {
    assert.equal(prefersMarkdown('*/*'), false)
  })

  it('prefers markdown when its q is higher than html', () => {
    assert.equal(
      prefersMarkdown('text/html;q=0.8, text/markdown;q=1'),
      true
    )
  })

  it('prefers html when its q is higher than markdown', () => {
    assert.equal(
      prefersMarkdown('text/markdown;q=0.5, text/html;q=1'),
      false
    )
  })

  it('treats equal q as markdown-preferring when both listed', () => {
    assert.equal(
      prefersMarkdown('text/markdown, text/html'),
      true
    )
  })
})
