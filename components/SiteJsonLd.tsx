import { headers } from 'next/headers'
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/seo/json-ld'

/**
 * Server-rendered Organization + WebSite JSON-LD.
 * Skips /ciceron (and nested demo paths) using the pathname middleware sets.
 */
export async function SiteJsonLd() {
  const pathname = (await headers()).get('x-pathname') ?? ''
  if (pathname.startsWith('/ciceron')) return null

  const organization = buildOrganizationJsonLd()
  const website = buildWebSiteJsonLd()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  )
}
