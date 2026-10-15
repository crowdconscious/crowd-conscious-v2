/**
 * Public Sello surfaces (/sello, /sello/[slug]). Server-only, service role.
 * Only closed + public readings ever leave here, and only through
 * toClientReading(). Status is computed per request (no cache), so a switch to
 * private or a billing stop removes the badge and the listing immediately.
 */
import 'server-only'
import { DEMO_ORG, DEMO_READINGS } from './demo-data'
import { toClientReading, type ClientReading } from './readings'
import { getOrgBySlug, listReadingRows, loadReading, orgDb } from './repo'
import { selloEarned } from './rules'

export type PublicOrg = { slug: string; name: string; sello: boolean; readings: ClientReading[]; demo: boolean }

export async function publicOrg(slug: string): Promise<PublicOrg | null> {
  if (slug === DEMO_ORG.slug) {
    const pub = DEMO_READINGS.filter((r) => r.status === 'closed' && r.visibility === 'public')
    return { slug, name: DEMO_ORG.name, demo: true, sello: selloEarned('active', DEMO_READINGS), readings: pub.map(toClientReading) }
  }
  const org = await getOrgBySlug(slug)
  if (!org) return null
  const rows = await listReadingRows(org.id)
  const pub = rows.filter((r) => r.status === 'closed' && r.visibility === 'public')
  const sello = selloEarned(org.billing_status, rows)
  // Nothing public and no Sello: reveal nothing (not even that the org is a client).
  if (!pub.length && !sello) return null
  const readings = await Promise.all(pub.map(async (r) => toClientReading(await loadReading(r))))
  return { slug: org.slug, name: org.name, demo: false, sello, readings }
}

/** Orgs whose Sello is active right now (paying AND a closed reading is public). */
export async function listSelloOrgs(): Promise<{ slug: string; name: string }[]> {
  const { data } = await orgDb().from('orgs').select('id, slug, name, billing_status').eq('billing_status', 'active').order('name')
  const orgs = (data as { id: string; slug: string; name: string; billing_status: 'active' | 'inactive' }[]) ?? []
  const out: { slug: string; name: string }[] = []
  for (const o of orgs) {
    const rows = await listReadingRows(o.id)
    if (selloEarned(o.billing_status, rows)) out.push({ slug: o.slug, name: o.name })
  }
  return out
}
