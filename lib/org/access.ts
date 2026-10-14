/**
 * Who may see /org/[slug]: a signed-in user listed in org_members (by user_id,
 * or by invited email on first visit, which then binds the user_id). The
 * fictitious demo org needs no login. Admins (isAdminUser) may view any org.
 */
import 'server-only'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { DEMO_ORG } from './demo-data'
import { getOrgBySlug, orgDb, type OrgRow } from './repo'

export type Role = 'owner' | 'viewer'
export type OrgAccess =
  | { kind: 'demo' }
  | { kind: 'member'; org: OrgRow; role: Role; userId: string; email: string; admin: boolean }
  | { kind: 'login' }
  | { kind: 'none' }

export async function orgAccess(slug: string): Promise<OrgAccess> {
  if (slug === DEMO_ORG.slug) return { kind: 'demo' }
  const user = await getCurrentUser()
  if (!user) return { kind: 'login' }
  const org = await getOrgBySlug(slug)
  if (!org) return { kind: 'none' }
  const email = String((user as { email?: string }).email ?? '').toLowerCase()
  const admin = isAdminUser(user)
  const safeEmail = /^[^\s,()"']+@[^\s,()"']+$/.test(email) ? email : ''
  const { data: rows } = await orgDb()
    .from('org_members')
    .select('id, role, user_id, email')
    .eq('org_id', org.id)
    .or(`user_id.eq.${user.id}${safeEmail ? `,email.eq.${safeEmail}` : ''}`)
  const m = ((rows as { id: string; role: Role; user_id: string | null; email: string }[]) ?? [])[0]
  if (m) {
    if (!m.user_id) await orgDb().from('org_members').update({ user_id: user.id, accepted_at: new Date().toISOString() }).eq('id', m.id).is('user_id', null)
    return { kind: 'member', org, role: m.role, userId: user.id, email, admin }
  }
  if (admin) return { kind: 'member', org, role: 'owner', userId: user.id, email, admin }
  return { kind: 'none' }
}
