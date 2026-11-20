import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  blogSchemaType,
  buildBlogArticleJsonLd,
  buildBlogBreadcrumbJsonLd,
  buildBlogCollectionJsonLd,
} from './blog-json-ld'

describe('blog JSON-LD', () => {
  it('uses Article for essay categories and NewsArticle otherwise', () => {
    assert.equal(blogSchemaType('insight'), 'Article')
    assert.equal(blogSchemaType('city_mobility'), 'NewsArticle')
  })

  it('builds a parseable NewsArticle with publisher logo', () => {
    const ld = buildBlogArticleJsonLd({
      slug: 'reventa-boletos-conciertos-cdmx-bruno-mars',
      headline: 'No hay boletos, solo en reventa',
      description: 'Comparación de precios de reventa.',
      datePublished: '2026-11-18T15:14:51.319+00:00',
      category: 'city_mobility',
    })
    assert.equal(ld['@type'], 'NewsArticle')
    assert.ok(JSON.parse(JSON.stringify(ld)))
    assert.match(String((ld.image as string[])[0]), /\/api\/og\/blog\//)
  })

  it('uses Person author when a name is provided', () => {
    const ld = buildBlogArticleJsonLd({
      slug: 'x',
      headline: 'H',
      description: 'D',
      authorName: 'Ana Pérez',
      category: 'insight',
    })
    assert.equal(ld['@type'], 'Article')
    assert.deepEqual(ld.author, { '@type': 'Person', name: 'Ana Pérez' })
  })

  it('builds BreadcrumbList and CollectionPage', () => {
    const crumbs = buildBlogBreadcrumbJsonLd({ slug: 'x', title: 'Title' })
    assert.equal(crumbs['@type'], 'BreadcrumbList')
    const collection = buildBlogCollectionJsonLd()
    assert.equal(collection['@type'], 'CollectionPage')
  })
})
