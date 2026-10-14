/**
 * Reading source for /org/[slug]. Until client auth + reading storage land
 * (Prompt 4), the only organization is the fictitious demo one, so the
 * route can be reviewed behind NEXT_PUBLIC_ORG_PORTAL_V2 without exposing
 * anything real. Always returns client-safe views (toClientReading).
 */
import { DEMO_ORG, DEMO_READINGS } from './demo-data'
import { toClientReading, type ClientReading } from './readings'

export type OrgView = { slug: string; name: string; demo: boolean; readings: ClientReading[] }

export async function getOrgView(slug: string): Promise<OrgView | null> {
  if (slug === DEMO_ORG.slug) {
    return { slug, name: DEMO_ORG.name, demo: true, readings: DEMO_READINGS.map(toClientReading) }
  }
  return null
}
