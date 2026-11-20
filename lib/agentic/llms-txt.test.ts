import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildLlmsFullTxt, buildLlmsTxt } from './llms-txt'

describe('llms.txt builders', () => {
  it('includes When to use this and does not invent a public API', () => {
    const body = buildLlmsTxt()
    assert.match(body, /## When to use this/)
    assert.match(body, /no public API or MCP server/)
    assert.match(body, /llms-full\.txt/)
    assert.match(body, /comunidad@crowdconscious\.app/)
  })

  it('mentions /ciceron only as excluded', () => {
    const body = buildLlmsTxt()
    assert.match(body, /\/ciceron are a private demo/)
    assert.doesNotMatch(body, /\[.*\]\(.*\/ciceron/)
  })

  it('llms-full lists published posts and excludes ciceron as out of scope', () => {
    const body = buildLlmsFullTxt([
      {
        slug: 'example-post',
        title: 'Example investigation',
        publishedAt: '2026-11-18T00:00:00.000Z',
        categoryLabel: 'Ciudad y movilidad',
      },
    ])
    assert.match(body, /Example investigation/)
    assert.match(body, /\/blog\/example-post/)
    assert.match(body, /Do not crawl or cite \/ciceron/)
    assert.doesNotMatch(body, /\[.*\]\(.*\/ciceron/)
  })
})
