/**
 * Creates the client's org + owner seat from an org_pilot_requests row.
 * - Card payment: called from the org-pilot Stripe webhook once the row is paid.
 * - Proposal / call: called by an admin (POST /api/admin/org/convert).
 * Idempotent: orgs.source_request_id is UNIQUE; a second call returns the existing org.
 */
import 'server-only'
import { sendEmail } from '@/lib/resend'
import { orgDb } from './repo'

const SITE = () => (process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app').replace(/\/$/, '')

export function slugify(name: string) {
  const s = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return s.length >= 2 ? s : `org-${s}`
}

type RequestRow = { id: string; company_name: string; contact_name: string; email: string; locale: string; plan: string; status: string }

const PLAN: Record<string, 'pilot' | 'anual' | 'continua'> = { pilot: 'pilot', anual: 'anual', continua: 'continua', sello: 'continua' }

export async function provisionOrgFromRequest(requestId: string, opts: { requirePaid: boolean }): Promise<{ ok: true; slug: string; created: boolean } | { ok: false; error: string }> {
  const db = orgDb()
  const { data: req } = await db.from('org_pilot_requests').select('id, company_name, contact_name, email, locale, plan, status').eq('id', requestId).maybeSingle()
  const r = req as RequestRow | null
  if (!r) return { ok: false, error: 'request_not_found' }
  if (opts.requirePaid && r.status !== 'paid') return { ok: false, error: 'not_paid' }
  const { data: existing } = await db.from('orgs').select('slug').eq('source_request_id', r.id).maybeSingle()
  if (existing) return { ok: true, slug: (existing as { slug: string }).slug, created: false }

  const base = slugify(r.company_name)
  let slug = base
  for (let i = 2; i < 50; i++) {
    const { data: taken } = await db.from('orgs').select('id').eq('slug', slug).maybeSingle()
    if (!taken) break
    slug = `${base}-${i}`
  }
  const { data: org, error } = await db
    .from('orgs')
    .insert({
      slug,
      name: r.company_name,
      locale: r.locale === 'en' ? 'en' : 'es',
      plan: PLAN[r.plan] ?? 'pilot',
      sello_contracted: r.plan === 'sello',
      source_request_id: r.id,
    })
    .select('id, slug')
    .single()
  if (error) {
    // Lost a race with another call for the same request: return that one.
    const { data: again } = await db.from('orgs').select('slug').eq('source_request_id', r.id).maybeSingle()
    if (again) return { ok: true, slug: (again as { slug: string }).slug, created: false }
    return { ok: false, error: error.message }
  }
  const email = r.email.trim().toLowerCase()
  await db.from('org_members').insert({ org_id: org.id, email, role: 'owner' })
  await sendSeatInvite({ email, orgName: r.company_name, slug: org.slug, role: 'owner', locale: r.locale === 'en' ? 'en' : 'es', contactName: r.contact_name })
  return { ok: true, slug: org.slug, created: true }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export async function sendSeatInvite(p: { email: string; orgName: string; slug: string; role: 'owner' | 'viewer'; locale: 'es' | 'en'; contactName?: string }) {
  const url = `${SITE()}/signup?redirect=${encodeURIComponent(`/org/${p.slug}`)}`
  const es = p.locale === 'es'
  const hi = p.contactName ? (es ? `Hola ${esc(p.contactName)}:` : `Hi ${esc(p.contactName)},`) : es ? 'Hola:' : 'Hi,'
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#0f1419;color:#e5e7eb;padding:24px;">
  <p style="color:#10b981;font-weight:bold;margin:0 0 16px;">Crowd Conscious · Organizaciones</p>
  <p style="font-size:15px;line-height:1.6;">${hi}</p>
  <p style="font-size:15px;line-height:1.6;">${es
    ? `Ya tiene acceso al panel de <strong>${esc(p.orgName)}</strong> (${p.role === 'owner' ? 'administrador' : 'lectura'}). Cree su cuenta (o inicie sesión, si ya tiene una) con este mismo correo: ${esc(p.email)}.`
    : `You now have access to the <strong>${esc(p.orgName)}</strong> dashboard (${p.role === 'owner' ? 'owner' : 'viewer'}). Create your account (or sign in, if you already have one) with this same email: ${esc(p.email)}.`}</p>
  <p style="margin:22px 0;"><a href="${url}" style="background:#34d399;color:#0f1419;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;">${es ? 'Abrir mi panel' : 'Open my dashboard'}</a></p>
  <p style="font-size:12px;color:#9ca3af;">${es ? 'Con cariño, el equipo de Crowd Conscious' : 'Warmly, the Crowd Conscious team'}</p></div>`
  return sendEmail(p.email, { subject: es ? `Su panel de ${p.orgName} en Crowd Conscious` : `Your ${p.orgName} dashboard on Crowd Conscious`, html })
}
