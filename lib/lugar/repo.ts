/**
 * Lugar Consciente data access (migration 289). Server-only, service role.
 * Callers must check ownership / membership / admin first.
 */
import 'server-only'
import { createAdminClient } from '@/lib/supabase-admin'
import { hashIpForStorage } from '@/lib/signals/fingerprint'
import { decide, expiryFrom, renewOrLapse, srcSlugFor, VALUES_VERSION, type Progress } from './rules'

// Tables are not in the generated types until 289 is applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createAdminClient() as any

export type Subject = { locationId: string } | { orgId: string }
const col = (s: Subject) => ('locationId' in s ? ['location_id', s.locationId] : ['org_id', s.orgId]) as [string, string]

export type Pledge = { id: string; signer_name: string; signer_role: string | null; version: string; accepted_at: string }
export type Award = {
  id: string
  seal_type: 'lugar_consciente' | 'sello_verificado'
  location_id: string | null
  org_id: string | null
  status: 'pending' | 'active' | 'lapsed' | 'revoked'
  awarded_by: 'auto' | 'auto_paid' | 'admin'
  earned_at: string | null
  expires_at: string | null
  suspicious: unknown
  note: string | null
}

export async function latestPledge(s: Subject): Promise<Pledge | null> {
  const [c, v] = col(s)
  const { data } = await db().from('values_pledges').select('id, signer_name, signer_role, version, accepted_at').eq(c, v).order('accepted_at', { ascending: false }).limit(1).maybeSingle()
  return (data as Pledge) ?? null
}
export const pledgeIsCurrent = (p: Pledge | null) => p?.version === VALUES_VERSION

/** ONE acceptance of all 7 values together. */
export async function acceptPledge(s: Subject, signer: { profileId: string | null; name: string; role: string | null }, ip: string | null): Promise<Pledge> {
  const [c, v] = col(s)
  const ip_hash = await hashIpForStorage(ip, process.env.SIGNALS_IP_SALT)
  const { data, error } = await db().from('values_pledges').insert({ [c]: v, signer_profile_id: signer.profileId, signer_name: signer.name, signer_role: signer.role, version: VALUES_VERSION, ip_hash }).select('id, signer_name, signer_role, version, accepted_at').single()
  if (error) throw error
  return data as Pledge
}

/** Gives a place its ?src= slug the first time its owner opens the program (no bulk backfill here). */
export async function ensureSrcSlug(loc: { id: string; slug: string; src_slug?: string | null }): Promise<string> {
  if (loc.src_slug) return loc.src_slug
  const { data: cur } = await db().from('conscious_locations').select('src_slug').eq('id', loc.id).maybeSingle()
  if (cur?.src_slug) return cur.src_slug as string
  const base = srcSlugFor(loc.slug)
  for (let i = 0; i < 5; i++) {
    const candidate = i ? `${base.slice(0, 37)}-${i + 1}` : base
    const { error } = await db().from('conscious_locations').update({ src_slug: candidate }).eq('id', loc.id).is('src_slug', null)
    if (!error) return candidate
    if (error.code !== '23505') throw error
  }
  throw new Error('src_slug collision')
}

export async function progressFor(locationId: string): Promise<Progress & { weeks: { week: string; voters: number }[] }> {
  const { data } = await db().from('lugar_consciente_progress').select('*').eq('location_id', locationId).maybeSingle()
  return {
    weeksOk: data?.weeks_ok ?? 0,
    totalVoters: data?.total_voters ?? 0,
    droppedVoterWeeks: data?.dropped_voter_weeks ?? 0,
    topIpVoters: data?.top_ip_voters ?? 0,
    weeks: (data?.weeks as { week: string; voters: number }[]) ?? [],
  }
}

export async function openAward(s: Subject, type: Award['seal_type'] = 'lugar_consciente'): Promise<Award | null> {
  const [c, v] = col(s)
  const { data } = await db().from('seal_awards').select('*').eq(c, v).eq('seal_type', type).in('status', ['pending', 'active']).maybeSingle()
  return (data as Award) ?? null
}

/** Active Lugar Consciente for a location slug or an org slug (public verify page). */
export async function activeLugarBySlug(slug: string): Promise<{ name: string; slug: string; award: Award; kind: 'location' | 'org' } | null> {
  const { data: loc } = await db().from('conscious_locations').select('id, name, slug').eq('slug', slug).maybeSingle()
  const { data: org } = loc ? { data: null } : await db().from('orgs').select('id, name, slug').eq('slug', slug).maybeSingle()
  const subj = loc ? { locationId: loc.id } : org ? { orgId: org.id } : null
  if (!subj) return null
  const a = await openAward(subj)
  if (!a || a.status !== 'active' || !a.expires_at || new Date(a.expires_at) <= new Date()) return null
  const row = (loc ?? org) as { name: string; slug: string }
  return { name: row.name, slug: row.slug, award: a, kind: loc ? 'location' : 'org' }
}

export async function listActiveLugares(): Promise<{ name: string; slug: string; expires_at: string }[]> {
  const { data } = await db().from('seal_awards').select('expires_at, conscious_locations(name, slug), orgs(name, slug)').eq('seal_type', 'lugar_consciente').eq('status', 'active').gt('expires_at', new Date().toISOString())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({ ...(r.conscious_locations ?? r.orgs), expires_at: r.expires_at })).filter((r) => r.slug).sort((a, b) => a.name.localeCompare(b.name))
}

async function logEvent(awardId: string, kind: string, detail: unknown, actor: string | null = null) {
  await db().from('seal_award_events').insert({ award_id: awardId, kind, detail, actor_profile_id: actor })
}

async function createAward(s: Subject, fields: Partial<Award> & { awarded_by: Award['awarded_by']; status: Award['status'] }, pledgeId: string | null) {
  const [c, v] = col(s)
  const now = new Date()
  const active = fields.status === 'active'
  const { data, error } = await db().from('seal_awards').insert({
    seal_type: 'lugar_consciente', [c]: v, pledge_id: pledgeId,
    earned_at: active ? now.toISOString() : null, expires_at: active ? expiryFrom(now).toISOString() : null,
    ...fields,
  }).select('*').single()
  if (error) {
    if (error.code === '23505') return null // someone else opened it first
    throw error
  }
  await logEvent(data.id, 'created', { status: fields.status, awarded_by: fields.awarded_by, suspicious: fields.suspicious ?? null })
  return data as Award
}

/**
 * Paying Sello verificado client: Lugar Consciente is automatic once its values
 * pledge is accepted (awarded_by = 'auto_paid'). Idempotent.
 */
export async function ensurePaidLugar(orgId: string, billingActive: boolean): Promise<Award | null> {
  if (!billingActive) return null
  const pledge = await latestPledge({ orgId })
  if (!pledgeIsCurrent(pledge)) return null
  return (await openAward({ orgId })) ?? (await createAward({ orgId }, { awarded_by: 'auto_paid', status: 'active' }, pledge!.id))
}

/** Daily job: award, flag, renew and lapse. Returns counts for the cron log. */
export async function runLugarConscienteJob(now = new Date()) {
  const out = { awarded: 0, pending: 0, renewed: 0, lapsed: 0, checked: 0 }
  const { data: locs } = await db().from('conscious_locations').select('id, src_slug, status').not('src_slug', 'is', null).in('status', ['pending', 'active', 'under_review'])
  for (const l of (locs as { id: string }[]) ?? []) {
    out.checked++
    const s = { locationId: l.id }
    if (await openAward(s)) continue
    const pledge = await latestPledge(s)
    const d = decide(await progressFor(l.id), pledgeIsCurrent(pledge))
    if (d.kind === 'award' && (await createAward(s, { awarded_by: 'auto', status: 'active' }, pledge!.id))) out.awarded++
    if (d.kind === 'pending' && (await createAward(s, { awarded_by: 'auto', status: 'pending', suspicious: { reasons: d.reasons } }, pledge!.id))) out.pending++
  }
  // Expired active awards: renew or lapse.
  const { data: due } = await db().from('seal_awards').select('*').eq('seal_type', 'lugar_consciente').eq('status', 'active').lte('expires_at', now.toISOString())
  for (const a of (due as Award[]) ?? []) {
    const s: Subject = a.location_id ? { locationId: a.location_id } : { orgId: a.org_id! }
    const pledge = await latestPledge(s)
    let billingActive = false
    if (a.org_id) {
      const { data: o } = await db().from('orgs').select('billing_status').eq('id', a.org_id).maybeSingle()
      billingActive = o?.billing_status === 'active'
    }
    const r = renewOrLapse({ awardedBy: a.awarded_by, billingActive, progress: a.location_id ? await progressFor(a.location_id) : undefined, pledgeCurrent: pledgeIsCurrent(pledge) })
    if (r === 'renew') {
      await db().from('seal_awards').update({ expires_at: expiryFrom(now).toISOString(), pledge_id: pledge?.id ?? null, updated_at: now.toISOString() }).eq('id', a.id)
      await logEvent(a.id, 'renewed', null); out.renewed++
    } else {
      // 'pending' at renewal = suspicious re-qualification: lapse and let admin reinstate.
      await db().from('seal_awards').update({ status: 'lapsed', updated_at: now.toISOString() }).eq('id', a.id)
      await logEvent(a.id, 'lapsed', { reason: r }); out.lapsed++
    }
  }
  return out
}

/** Admin override: approve a pending award, revoke, or extend 12 months. */
export async function adminAct(awardId: string, action: 'approve' | 'revoke' | 'extend', actor: string, note: string | null) {
  const now = new Date()
  const { data: a } = await db().from('seal_awards').select('*').eq('id', awardId).maybeSingle()
  if (!a) return { ok: false as const, error: 'not_found' }
  let patch: Record<string, unknown>
  if (action === 'approve') {
    if (a.status !== 'pending') return { ok: false as const, error: 'not_pending' }
    patch = { status: 'active', earned_at: now.toISOString(), expires_at: expiryFrom(now).toISOString() }
  } else if (action === 'revoke') {
    if (!['pending', 'active'].includes(a.status)) return { ok: false as const, error: 'not_open' }
    patch = { status: 'revoked' }
  } else {
    if (a.status !== 'active') return { ok: false as const, error: 'not_active' }
    patch = { expires_at: expiryFrom(new Date(a.expires_at)).toISOString() }
  }
  await db().from('seal_awards').update({ ...patch, reviewed_by: actor, note, updated_at: now.toISOString() }).eq('id', awardId)
  await logEvent(awardId, action === 'approve' ? 'activated' : action === 'revoke' ? 'revoked' : 'extended', { note }, actor)
  return { ok: true as const }
}

/** Admin: grant directly (e.g. to a place reviewed by hand). */
export async function adminGrant(locationId: string, actor: string, note: string | null) {
  const pledge = await latestPledge({ locationId })
  if (!pledgeIsCurrent(pledge)) return { ok: false as const, error: 'pledge_required' }
  const a = await createAward({ locationId }, { awarded_by: 'admin', status: 'active', note, reviewed_by: actor } as never, pledge!.id)
  return a ? { ok: true as const } : { ok: false as const, error: 'already_open' }
}

export async function listAwardsForAdmin() {
  const { data } = await db().from('seal_awards').select('*, conscious_locations(name, slug), orgs(name, slug)').eq('seal_type', 'lugar_consciente').order('status').order('created_at', { ascending: false }).limit(200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]) ?? []
}
