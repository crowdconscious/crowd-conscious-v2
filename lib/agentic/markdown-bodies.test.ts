import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  blogPostMarkdown,
  homepageMarkdown,
  notFoundMarkdown,
} from './markdown-bodies'

describe('markdown bodies', () => {
  it('homepage markdown has an h1 and links to llms.txt + sitemap', () => {
    const body = homepageMarkdown()
    assert.match(body, /^# Crowd Conscious/m)
    assert.match(body, /llms\.txt/)
    assert.match(body, /sitemap\.xml/)
    assert.ok(body.length > 20)
  })

  it('404 markdown is ≥20 chars and links sitemap + llms.txt', () => {
    const body = notFoundMarkdown('/no-such-page')
    assert.ok(body.length >= 20)
    assert.match(body, /sitemap\.xml/)
    assert.match(body, /llms\.txt/)
    assert.match(body, /no-such-page/)
  })

  it('blog post markdown includes title and URL', () => {
    const body = blogPostMarkdown({
      title: 'Test investigation',
      slug: 'test-investigation',
      description: 'A short summary.',
      publishedAt: '2026-11-18',
    })
    assert.match(body, /^# Test investigation/m)
    assert.match(body, /\/blog\/test-investigation/)
    assert.match(body, /A short summary/)
  })
})
